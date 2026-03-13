# generate_dataset.py
# ─────────────────────────────────────────────────────────────────────────────
# RiskLens — Fixed Synthetic Training Data Generator
# Key fix: overlapping feature distributions across classes with added noise
# so no single feature can perfectly separate classes.
#
# Output: data/training_dataset.csv  (14 features + risk_label column)
#
# Usage:
#   cd ml_training
#   python generate_dataset.py
# ─────────────────────────────────────────────────────────────────────────────

import os
import numpy as np
import pandas as pd

np.random.seed(42)

N = 5000  # Total rows — 1250 per class

def add_noise(arr, scale=0.05):
    """Add small Gaussian noise to continuous features to create overlap."""
    return arr + np.random.normal(0, scale, len(arr))

# ── Risk Class 0: LOW ────────────────────────────────────────────────────────
def make_low(n):
    return dict(
        night_commit_ratio      = np.clip(add_noise(np.random.beta(1, 8, n), 0.05), 0, 1).round(4),
        pr_lines_changed        = np.random.randint(10, 400, n),               # overlaps with moderate
        pr_files_changed        = np.random.randint(1, 10, n),                 # overlaps with moderate
        review_gap_hours        = np.clip(add_noise(np.random.exponential(5, n), 1.0), 0.5, 30).round(2),
        review_depth_score      = np.clip(add_noise(np.log1p(np.random.randint(2, 10, n)).astype(float), 0.2), 0, None).round(4),
        consecutive_ci_failures = np.random.randint(0, 3, n),                 # slight overlap
        ci_pass_rate_7d         = np.clip(add_noise(np.random.uniform(0.75, 1.0, n), 0.05), 0, 1).round(4),
        deadline_24h_count      = np.random.randint(0, 2, n),                 # slight overlap
        deadline_48h_count      = np.random.randint(0, 3, n),
        open_ticket_count       = np.random.randint(1, 7, n),
        commit_velocity_spike   = np.clip(add_noise(np.random.uniform(0.5, 1.8, n), 0.15), 0.1, None).round(4),
        cross_team_files_ratio  = np.clip(add_noise(np.random.beta(1, 7, n), 0.05), 0, 1).round(4),
        test_file_updated       = np.random.binomial(1, 0.80, n),
        hotfix_label_present    = np.random.binomial(1, 0.05, n),             # small overlap
        risk_label              = np.zeros(n, dtype=int),
    )

# ── Risk Class 1: MODERATE ───────────────────────────────────────────────────
def make_moderate(n):
    return dict(
        night_commit_ratio      = np.clip(add_noise(np.random.beta(2, 5, n), 0.06), 0, 1).round(4),
        pr_lines_changed        = np.random.randint(150, 800, n),              # overlaps low & high
        pr_files_changed        = np.random.randint(4, 22, n),
        review_gap_hours        = np.clip(add_noise(np.random.exponential(14, n), 2.0), 1, 60).round(2),
        review_depth_score      = np.clip(add_noise(np.log1p(np.random.randint(1, 7, n)).astype(float), 0.2), 0, None).round(4),
        consecutive_ci_failures = np.random.randint(0, 4, n),
        ci_pass_rate_7d         = np.clip(add_noise(np.random.uniform(0.55, 0.90, n), 0.05), 0, 1).round(4),
        deadline_24h_count      = np.random.randint(0, 3, n),
        deadline_48h_count      = np.random.randint(1, 5, n),
        open_ticket_count       = np.random.randint(3, 13, n),
        commit_velocity_spike   = np.clip(add_noise(np.random.uniform(1.0, 2.5, n), 0.20), 0.1, None).round(4),
        cross_team_files_ratio  = np.clip(add_noise(np.random.beta(2, 5, n), 0.06), 0, 1).round(4),
        test_file_updated       = np.random.binomial(1, 0.55, n),
        hotfix_label_present    = np.random.binomial(1, 0.15, n),
        risk_label              = np.ones(n, dtype=int),
    )

# ── Risk Class 2: HIGH ───────────────────────────────────────────────────────
def make_high(n):
    return dict(
        night_commit_ratio      = np.clip(add_noise(np.random.beta(3, 4, n), 0.07), 0, 1).round(4),
        pr_lines_changed        = np.random.randint(500, 2200, n),             # overlaps moderate & critical
        pr_files_changed        = np.random.randint(12, 45, n),
        review_gap_hours        = np.clip(add_noise(np.random.exponential(35, n), 4.0), 6, 110).round(2),
        review_depth_score      = np.clip(add_noise(np.log1p(np.random.randint(0, 4, n)).astype(float), 0.15), 0, None).round(4),
        consecutive_ci_failures = np.random.randint(2, 8, n),
        ci_pass_rate_7d         = np.clip(add_noise(np.random.uniform(0.28, 0.70, n), 0.05), 0, 1).round(4),
        deadline_24h_count      = np.random.randint(1, 5, n),
        deadline_48h_count      = np.random.randint(2, 7, n),
        open_ticket_count       = np.random.randint(7, 20, n),
        commit_velocity_spike   = np.clip(add_noise(np.random.uniform(1.8, 4.0, n), 0.25), 0.1, None).round(4),
        cross_team_files_ratio  = np.clip(add_noise(np.random.beta(3, 4, n), 0.07), 0, 1).round(4),
        test_file_updated       = np.random.binomial(1, 0.28, n),
        hotfix_label_present    = np.random.binomial(1, 0.38, n),
        risk_label              = np.full(n, 2, dtype=int),
    )

# ── Risk Class 3: CRITICAL ───────────────────────────────────────────────────
def make_critical(n):
    return dict(
        night_commit_ratio      = np.clip(add_noise(np.random.beta(5, 2, n), 0.07), 0, 1).round(4),
        pr_lines_changed        = np.random.randint(1200, 5000, n),
        pr_files_changed        = np.random.randint(30, 85, n),
        review_gap_hours        = np.clip(add_noise(np.random.exponential(65, n), 6.0), 20, 210).round(2),
        review_depth_score      = np.clip(add_noise(np.zeros(n).astype(float), 0.1), 0, None).round(4),
        consecutive_ci_failures = np.random.randint(4, 16, n),
        ci_pass_rate_7d         = np.clip(add_noise(np.random.uniform(0.0, 0.42, n), 0.04), 0, 1).round(4),
        deadline_24h_count      = np.random.randint(2, 9, n),
        deadline_48h_count      = np.random.randint(3, 11, n),
        open_ticket_count       = np.random.randint(13, 32, n),
        commit_velocity_spike   = np.clip(add_noise(np.random.uniform(3.0, 7.5, n), 0.30), 0.1, None).round(4),
        cross_team_files_ratio  = np.clip(add_noise(np.random.beta(6, 2, n), 0.07), 0, 1).round(4),
        test_file_updated       = np.random.binomial(1, 0.08, n),             # mostly 0 but slight overlap
        hotfix_label_present    = np.random.binomial(1, 0.90, n),             # mostly 1 but slight overlap
        risk_label              = np.full(n, 3, dtype=int),
    )


def main():
    per_class   = N // 4
    remainder   = N - (3 * per_class)
    class_sizes = [per_class, per_class, per_class, remainder]

    print(f"Generating {N} rows ({per_class} per class) with overlapping distributions...")

    frames = [
        pd.DataFrame(make_low(class_sizes[0])),
        pd.DataFrame(make_moderate(class_sizes[1])),
        pd.DataFrame(make_high(class_sizes[2])),
        pd.DataFrame(make_critical(class_sizes[3])),
    ]

    df = pd.concat(frames, ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    # Ensure correct dtypes
    int_cols = [
        "pr_lines_changed", "pr_files_changed", "consecutive_ci_failures",
        "deadline_24h_count", "deadline_48h_count", "open_ticket_count",
        "test_file_updated", "hotfix_label_present", "risk_label"
    ]
    for col in int_cols:
        df[col] = df[col].astype(int)

    # Validate
    assert df.isnull().sum().sum() == 0, "❌ Dataset contains null values!"
    assert df.shape[1] == 15, f"❌ Expected 15 columns, got {df.shape[1]}"

    os.makedirs("data", exist_ok=True)
    output_path = os.path.join("data", "training_dataset.csv")
    df.to_csv(output_path, index=False)

    print(f"\n✅ Dataset saved: {output_path}")
    print(f"   Shape         : {df.shape}")
    print(f"\n   Class distribution:")
    print(df["risk_label"].value_counts().sort_index().to_string())
    print(f"\n   Feature ranges (sanity check):")
    print(df[["commit_velocity_spike", "ci_pass_rate_7d", "night_commit_ratio"]].describe().T[["min","max","mean"]].to_string())
    print(f"\n✅ Distributions are overlapping — no single feature will dominate training.")


if __name__ == "__main__":
    main()
