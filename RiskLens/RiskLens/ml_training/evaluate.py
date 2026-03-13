# evaluate.py
# ─────────────────────────────────────────────────────────────────────────────
# RiskLens — Model Evaluation Script
# Loads the saved model + scaler, runs evaluation on the hold-out test set,
# and produces:
#   - confusion_matrix.png
#   - feature_importances.png
#   - Full classification report in terminal
#
# Run AFTER train.py:
#   cd ml_training
#   python evaluate.py
# ─────────────────────────────────────────────────────────────────────────────

import os
import sys
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    ConfusionMatrixDisplay,
)
from sklearn.model_selection import train_test_split

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_PATH   = os.path.join(SCRIPT_DIR, "data", "training_dataset.csv")
ML_DIR      = os.path.join(SCRIPT_DIR, "..", "backend", "app", "ml")
MODEL_PATH  = os.path.join(ML_DIR, "model.pkl")
SCALER_PATH = os.path.join(ML_DIR, "scaler.pkl")

# ── Feature list — must match train.py exactly ───────────────────────────────
FEATURES = [
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

TARGET      = "risk_label"
CLASS_NAMES = ["LOW", "MODERATE", "HIGH", "CRITICAL"]


def load_artifacts():
    for path, name in [(MODEL_PATH, "model.pkl"), (SCALER_PATH, "scaler.pkl")]:
        if not os.path.exists(path):
            print(f"❌ {name} not found at {path}")
            print("   Run train.py first.")
            sys.exit(1)

    model  = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print("✅ model.pkl and scaler.pkl loaded.")
    return model, scaler


def load_test_split():
    if not os.path.exists(DATA_PATH):
        print(f"❌ Dataset not found at {DATA_PATH}")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    # Use same random_state as train.py to get the same test split
    _, X_test, _, y_test = train_test_split(
        df[FEATURES], df[TARGET],
        test_size=0.2, stratify=df[TARGET], random_state=42
    )
    print(f"✅ Test split loaded: {len(X_test)} rows")
    return X_test, y_test


def plot_confusion_matrix(y_test, y_pred):
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Purples",
        xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES,
        linewidths=0.5, linecolor="white"
    )
    plt.title("RiskLens — Confusion Matrix", fontsize=14, fontweight="bold")
    plt.xlabel("Predicted Label", fontsize=12)
    plt.ylabel("True Label", fontsize=12)
    plt.tight_layout()
    out = os.path.join(SCRIPT_DIR, "confusion_matrix.png")
    plt.savefig(out, dpi=150)
    plt.close()
    print(f"✅ Confusion matrix saved → {out}")


def plot_feature_importances(model):
    importances = model.feature_importances_
    idx = importances.argsort()[::-1]

    plt.figure(figsize=(10, 7))
    colors = ["#5C3B9E" if imp > 0.10 else "#A68FD8" for imp in importances[idx]]
    plt.barh(
        [FEATURES[i] for i in idx],
        importances[idx],
        color=colors,
        edgecolor="white",
    )
    plt.gca().invert_yaxis()
    plt.xlabel("Importance Score", fontsize=12)
    plt.title("RiskLens — Feature Importances (GradientBoosting)", fontsize=14, fontweight="bold")
    plt.axvline(x=0.10, color="red", linestyle="--", linewidth=1, alpha=0.6, label="10% threshold")
    plt.legend()
    plt.tight_layout()
    out = os.path.join(SCRIPT_DIR, "feature_importances.png")
    plt.savefig(out, dpi=150)
    plt.close()
    print(f"✅ Feature importances saved → {out}")


def check_health(y_test, y_pred, model):
    print("\n🔍 Model Health Checks:")

    # 1. Per-class F1
    f1_per_class = f1_score(y_test, y_pred, average=None)
    all_pass = True
    for i, (name, f1) in enumerate(zip(CLASS_NAMES, f1_per_class)):
        status = "✅" if f1 >= 0.70 else "❌"
        if f1 < 0.70:
            all_pass = False
        print(f"   {status} {name:<10} F1 = {f1:.3f}  {'(target ≥ 0.70)' if f1 < 0.70 else ''}")

    if not all_pass:
        print("   ⚠️  Some classes below F1 0.70. Increase N in generate_dataset.py and retrain.")

    # 2. Cross-band confusion check (LOW → CRITICAL or CRITICAL → LOW)
    cm = confusion_matrix(y_test, y_pred)
    cross_band = cm[0, 3] + cm[3, 0]   # LOW↔CRITICAL misclassifications
    if cross_band > 0:
        print(f"   ⚠️  Cross-band confusion (LOW↔CRITICAL): {cross_band} cases — investigate data.")
    else:
        print(f"   ✅ No cross-band confusion (LOW↔CRITICAL).")

    # 3. Single-feature dominance
    importances = model.feature_importances_
    max_imp = importances.max()
    max_feat = FEATURES[importances.argmax()]
    if max_imp > 0.40:
        print(f"   ⚠️  '{max_feat}' dominates at {max_imp:.2f} — possible data leakage.")
    else:
        print(f"   ✅ No single feature dominates (max = {max_imp:.2f}).")


def main():
    print("=" * 60)
    print("  RiskLens Model Evaluation")
    print("=" * 60)

    model, scaler  = load_artifacts()
    X_test, y_test = load_test_split()

    X_test_s = scaler.transform(X_test)
    y_pred   = model.predict(X_test_s)

    # Classification report
    print("\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES))

    macro_f1 = f1_score(y_test, y_pred, average="macro")
    print(f"   Overall F1 macro: {macro_f1:.3f}  {'✅' if macro_f1 >= 0.82 else '⚠️ below target 0.82'}")

    # Plots
    plot_confusion_matrix(y_test, y_pred)
    plot_feature_importances(model)

    # Health checks
    check_health(y_test, y_pred, model)

    print("\n" + "=" * 60)
    print("  Evaluation complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
