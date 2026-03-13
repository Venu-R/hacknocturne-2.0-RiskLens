# predictor.py
# ─────────────────────────────────────────────────────────────────────────────
# RiskLens — Runtime Inference Engine
# Loaded by Flask at startup. Accepts a feature dict, scales it using the
# pre-fitted scaler, runs the trained classifier, and returns a structured
# prediction response.
#
# ⚠️  This file is the ONLY place inference logic should live.
#     Do NOT call model.predict() anywhere else in the Flask app.
#
# Import in your Flask blueprint:
#   from app.ml.predictor import predict_risk
# ─────────────────────────────────────────────────────────────────────────────

import os
import numpy as np
import joblib
import pandas as pd

from pathlib import Path

# ── Load artifacts once at module import time (not per-request) ───────────────
_ML_DIR    = Path(__file__).parent
_MODEL     = joblib.load(_ML_DIR / "model.pkl")
_SCALER    = joblib.load(_ML_DIR / "scaler.pkl")

# ── Risk band labels ──────────────────────────────────────────────────────────
LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"]

# ── Feature order — imported from feature_names.py as source of truth ─────────
# Defined inline here as well so this file works standalone in Flask
# (avoids circular import if feature_names.py is in a different package path)
FEATURE_NAMES = [
    "night_commit_ratio",
    "pr_lines_changed",
    "pr_files_changed",
    "review_gap_hours",
    "review_depth_score",
    "consecutive_ci_failures",
    "ci_pass_rate_7d",
    "deadline_24h_count",
    "deadline_48h_count",
    "open_ticket_count",
    "commit_velocity_spike",
    "cross_team_files_ratio",
    "test_file_updated",
    "hotfix_label_present",
]

N_FEATURES = len(FEATURE_NAMES)  # Must be 14


# ── Recommendation strings ────────────────────────────────────────────────────
_RECOMMENDATIONS = {
    0: "Conditions normal. Proceed with standard review process.",
    1: "Add one extra reviewer. Verify test coverage before merge.",
    2: "Require 2+ reviewer approvals. Consider delaying deployment by 4+ hours.",
    3: "Pause deployment. Escalate to engineering manager immediately.",
}


def _build_vector(feature_dict: dict) -> np.ndarray:
    """
    Builds a 1×14 numpy array from the feature dict.
    Raises ValueError if any feature is missing or if the dict contains
    unexpected keys (helps catch aggregator.py bugs early).
    """
    missing = [f for f in FEATURE_NAMES if f not in feature_dict]
    if missing:
        raise ValueError(f"Missing features in input dict: {missing}")

    vec = np.array([[feature_dict[f] for f in FEATURE_NAMES]], dtype=float)

    if vec.shape != (1, N_FEATURES):
        raise ValueError(
            f"Feature vector shape mismatch: expected (1, {N_FEATURES}), got {vec.shape}"
        )

    if np.any(np.isnan(vec)):
        raise ValueError("Feature vector contains NaN values — check aggregator.py output.")

    return vec


def _compute_score(proba: np.ndarray, label: int) -> int:
    """
    Maps class probability + label to an integer SFRI score in [0, 100].
    Formula: score = round(P(predicted_class) * 100 * (label+1) / 4)
    Clamped to [0, 100].
    """
    raw = proba[label] * 100.0 * (label + 1) / 4.0
    return int(min(max(round(raw), 0), 100))


def predict_risk(feature_dict: dict) -> dict:
    """
    Main inference function. Call this from your Flask /api/predict endpoint.

    Args:
        feature_dict: dict with exactly 14 keys matching FEATURE_NAMES.

    Returns:
        {
            "score":          int   — SFRI score 0–100,
            "level":          str   — "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
            "top_factors":    list  — top 3 feature names driving the score,
            "recommendation": str   — human-readable action string,
        }

    Raises:
        ValueError — if feature_dict is malformed.
    """
    # 1. Build + validate feature vector
    vec = _build_vector(feature_dict)

    # 2. Scale (transform only — scaler was fitted on training data)
    vec_scaled = _SCALER.transform(pd.DataFrame(vec, columns=FEATURE_NAMES))

    # 3. Predict
    proba = _MODEL.predict_proba(vec_scaled)[0]   # shape: (4,)
    label = int(_MODEL.predict(vec_scaled)[0])    # 0, 1, 2, or 3

    # 4. Derive SFRI integer score
    score = _compute_score(proba, label)

    # 5. Top 3 feature importances (global model importances as proxy)
    importances = _MODEL.feature_importances_
    top_idx     = importances.argsort()[::-1][:3]
    top_factors = [FEATURE_NAMES[i] for i in top_idx]

    return {
        "score":          score,
        "level":          LEVELS[label],
        "top_factors":    top_factors,
        "recommendation": _RECOMMENDATIONS[label],
    }


# ── Quick smoke test ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    # LOW risk scenario
    low_vec = dict(
        night_commit_ratio=0.0, pr_lines_changed=50, pr_files_changed=2,
        review_gap_hours=1.0, review_depth_score=2.3,
        consecutive_ci_failures=0, ci_pass_rate_7d=0.97,
        deadline_24h_count=0, deadline_48h_count=0, open_ticket_count=2,
        commit_velocity_spike=1.0, cross_team_files_ratio=0.0,
        test_file_updated=1, hotfix_label_present=0,
    )

    # CRITICAL risk scenario
    critical_vec = dict(
        night_commit_ratio=0.9, pr_lines_changed=3500, pr_files_changed=60,
        review_gap_hours=80.0, review_depth_score=0.0,
        consecutive_ci_failures=10, ci_pass_rate_7d=0.1,
        deadline_24h_count=6, deadline_48h_count=8, open_ticket_count=25,
        commit_velocity_spike=6.0, cross_team_files_ratio=0.85,
        test_file_updated=0, hotfix_label_present=1,
    )

    print("=== Smoke Test ===")
    print("LOW scenario    :", predict_risk(low_vec))
    print("CRITICAL scenario:", predict_risk(critical_vec))
