# train.py
# ─────────────────────────────────────────────────────────────────────────────
# RiskLens — Fixed ML Training Pipeline
# Uses overlapping synthetic data — model must learn from all 14 features.
# Targets CV F1 macro ≥ 0.82 with balanced feature importance distribution.
#
# Usage:
#   cd ml_training
#   python train.py
# ─────────────────────────────────────────────────────────────────────────────

import os
import sys
import joblib
import pandas as pd
import numpy as np

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, f1_score

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_PATH   = os.path.join(SCRIPT_DIR, "data", "training_dataset.csv")
OUTPUT_DIR  = os.path.join(SCRIPT_DIR, "..", "backend", "app", "ml")
MODEL_PATH  = os.path.join(OUTPUT_DIR, "model.pkl")
SCALER_PATH = os.path.join(OUTPUT_DIR, "scaler.pkl")

# ── Feature list ─────────────────────────────────────────────────────────────
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


def load_data():
    if not os.path.exists(DATA_PATH):
        print(f"❌ Dataset not found at: {DATA_PATH}")
        print("   Run generate_dataset.py first.")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    print(f"✅ Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")

    missing = [f for f in FEATURES + [TARGET] if f not in df.columns]
    if missing:
        print(f"❌ Missing columns: {missing}")
        sys.exit(1)

    nulls = df[FEATURES + [TARGET]].isnull().sum().sum()
    if nulls > 0:
        print(f"❌ Dataset contains {nulls} null values.")
        sys.exit(1)

    print(f"\n   Class distribution:")
    print(df[TARGET].value_counts().sort_index().to_string())
    return df


def train(df):
    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # Scale — fit on training data ONLY
    scaler      = StandardScaler()
    X_train_s   = scaler.fit_transform(X_train)
    X_test_s    = scaler.transform(X_test)

    print(f"\n📊 Training set : {X_train_s.shape[0]} rows")
    print(f"📊 Test set     : {X_test_s.shape[0]} rows")

    # ── Model — tuned for overlapping distributions ───────────────────────────
    # max_depth=3 prevents overfitting to any single feature
    # n_estimators=300 gives more trees to learn subtle patterns
    # min_samples_leaf=15 forces broader generalization
    model = GradientBoostingClassifier(
        n_estimators     = 300,
        learning_rate    = 0.05,
        max_depth        = 3,
        subsample        = 0.8,
        min_samples_leaf = 15,
        max_features     = "sqrt",   # forces each tree to consider random feature subsets
        random_state     = 42,
    )

    print("\n🚀 Training GradientBoostingClassifier...")
    model.fit(X_train_s, y_train)
    print("   Training complete.")

    # Cross-validation
    print("\n🔄 Running 5-fold stratified cross-validation...")
    cv      = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    X_all_s = scaler.transform(X)
    cv_scores = cross_val_score(model, X_all_s, y, cv=cv, scoring="f1_macro")
    print(f"   CV F1 macro: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    if cv_scores.mean() < 0.80:
        print("⚠️  WARNING: CV F1 below 0.80.")
        print("   Try increasing N in generate_dataset.py to 8000 and retrain.")
    else:
        print("   ✅ CV F1 target met (≥ 0.80).")

    # Test set evaluation
    y_pred = model.predict(X_test_s)
    print("\n📋 Classification Report (Test Set):")
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES))

    test_f1 = f1_score(y_test, y_pred, average="macro")
    print(f"   Test F1 macro: {test_f1:.3f}")

    # Feature importances — health check
    importances = model.feature_importances_
    sorted_idx  = importances.argsort()[::-1]

    print("\n📊 Top 5 Feature Importances:")
    for i in sorted_idx[:5]:
        print(f"   {FEATURES[i]:<30} {importances[i]:.4f}")

    max_importance = importances.max()
    max_feat       = FEATURES[importances.argmax()]

    if max_importance > 0.40:
        print(f"\n⚠️  WARNING: '{max_feat}' still dominates at {max_importance:.2f}.")
        print("   This suggests the synthetic data still has too-clean separation.")
        print("   The model will still work but may not generalise perfectly to real data.")
    else:
        print(f"\n✅ Feature importance looks healthy — no single feature dominates.")
        print(f"   Max importance: {max_feat} at {max_importance:.2f}")

    return model, scaler


def save_artifacts(model, scaler):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    joblib.dump(model,  MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\n✅ model.pkl  saved → {MODEL_PATH}")
    print(f"✅ scaler.pkl saved → {SCALER_PATH}")
    print("\n   ⚠️  Both files are a matched pair — never replace one without the other.\n")


def main():
    print("=" * 60)
    print("  RiskLens ML Training Pipeline (Fixed)")
    print("=" * 60)

    df            = load_data()
    model, scaler = train(df)
    save_artifacts(model, scaler)

    print("=" * 60)
    print("  Training complete. Next steps:")
    print("  1. Run evaluate.py       — inspect confusion matrix + plots")
    print("  2. Run feature_analysis.py — verify no feature dominates")
    print("  3. Start Flask           — predictor.py loads model.pkl automatically")
    print("=" * 60)


if __name__ == "__main__":
    main()
