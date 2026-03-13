# feature_analysis.py
# ─────────────────────────────────────────────────────────────────────────────
# RiskLens — Feature Analysis & EDA Script
# Run this BEFORE training to inspect the dataset and catch issues early.
#
# Produces:
#   - correlation_heatmap.png   — feature correlation matrix
#   - class_distribution.png   — bar chart of risk label balance
#   - boxplots_by_class.png     — per-feature distribution across risk classes
#   - risk_label_correlation.txt — ranked feature correlations with target
#
# Usage:
#   cd ml_training
#   python feature_analysis.py
# ─────────────────────────────────────────────────────────────────────────────

import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(SCRIPT_DIR, "data", "training_dataset.csv")

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
CLASS_NAMES = {0: "LOW", 1: "MODERATE", 2: "HIGH", 3: "CRITICAL"}
PALETTE     = {0: "#4CAF50", 1: "#FFC107", 2: "#FF5722", 3: "#9C27B0"}


def load_data():
    if not os.path.exists(DATA_PATH):
        print(f"❌ Dataset not found at {DATA_PATH}")
        print("   Run generate_dataset.py first.")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    print(f"✅ Dataset loaded: {df.shape[0]} rows × {df.shape[1]} columns")
    return df


def plot_class_distribution(df):
    counts = df[TARGET].value_counts().sort_index()
    labels = [CLASS_NAMES[i] for i in counts.index]
    colors = [PALETTE[i] for i in counts.index]

    plt.figure(figsize=(7, 5))
    bars = plt.bar(labels, counts.values, color=colors, edgecolor="white", linewidth=1.5)
    for bar, val in zip(bars, counts.values):
        plt.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 10,
                 str(val), ha="center", va="bottom", fontsize=11, fontweight="bold")

    plt.title("RiskLens — Class Distribution", fontsize=14, fontweight="bold")
    plt.ylabel("Row Count")
    plt.ylim(0, counts.max() * 1.15)
    plt.tight_layout()
    out = os.path.join(SCRIPT_DIR, "class_distribution.png")
    plt.savefig(out, dpi=150)
    plt.close()
    print(f"✅ Class distribution saved → {out}")


def plot_correlation_heatmap(df):
    corr = df[FEATURES + [TARGET]].corr()

    plt.figure(figsize=(14, 11))
    mask = np.triu(np.ones_like(corr, dtype=bool))   # upper triangle mask
    sns.heatmap(
        corr, mask=mask, annot=True, fmt=".2f",
        cmap="coolwarm", center=0, linewidths=0.4,
        annot_kws={"size": 7}, vmin=-1, vmax=1
    )
    plt.title("RiskLens — Feature Correlation Matrix", fontsize=14, fontweight="bold")
    plt.xticks(rotation=45, ha="right", fontsize=8)
    plt.yticks(rotation=0, fontsize=8)
    plt.tight_layout()
    out = os.path.join(SCRIPT_DIR, "correlation_heatmap.png")
    plt.savefig(out, dpi=150)
    plt.close()
    print(f"✅ Correlation heatmap saved → {out}")

    # ── Red-flag check ────────────────────────────────────────────────────────
    label_corrs = corr[TARGET].drop(TARGET).abs().sort_values(ascending=False)
    print("\n🔍 Feature correlation with risk_label (absolute values):")
    for feat, val in label_corrs.items():
        flag = "⚠️  HIGH — check for leakage!" if val > 0.95 else ""
        print(f"   {feat:<30} {val:.3f}  {flag}")

    # Save to txt
    out_txt = os.path.join(SCRIPT_DIR, "risk_label_correlation.txt")
    with open(out_txt, "w") as f:
        f.write("Feature correlations with risk_label (absolute, sorted)\n")
        f.write("=" * 55 + "\n")
        for feat, val in label_corrs.items():
            flag = "  ← HIGH - check for leakage!" if val > 0.95 else ""
            f.write(f"{feat:<30} {val:.4f}{flag}\n")
    print(f"✅ Correlation text saved → {out_txt}")


def plot_boxplots(df):
    # Select the 6 most informative continuous features for boxplots
    plot_features = [
        "night_commit_ratio", "pr_lines_changed", "review_gap_hours",
        "ci_pass_rate_7d", "commit_velocity_spike", "consecutive_ci_failures"
    ]

    fig, axes = plt.subplots(2, 3, figsize=(16, 9))
    fig.suptitle("RiskLens — Feature Distribution by Risk Class",
                 fontsize=15, fontweight="bold", y=1.01)

    df_plot = df.copy()
    df_plot["risk_class"] = df_plot[TARGET].map(CLASS_NAMES)
    order = ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    palette = {"LOW": "#4CAF50", "MODERATE": "#FFC107", "HIGH": "#FF5722", "CRITICAL": "#9C27B0"}

    for ax, feat in zip(axes.flat, plot_features):
        sns.boxplot(
            data=df_plot, x="risk_class", y=feat,
            order=order, palette=palette, ax=ax,
            width=0.5, linewidth=1.2, fliersize=2
        )
        ax.set_title(feat, fontsize=10, fontweight="bold")
        ax.set_xlabel("")
        ax.set_ylabel("")
        ax.tick_params(axis="x", labelsize=8)

    plt.tight_layout()
    out = os.path.join(SCRIPT_DIR, "boxplots_by_class.png")
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"✅ Boxplots saved → {out}")


def print_summary_stats(df):
    print("\n📊 Dataset Summary:")
    print(f"   Total rows  : {len(df)}")
    print(f"   Features    : {len(FEATURES)}")
    print(f"   Null values : {df.isnull().sum().sum()}")
    print("\n   Numeric feature ranges:")
    desc = df[FEATURES].describe().T[["min", "max", "mean", "std"]]
    print(desc.to_string())


def main():
    print("=" * 60)
    print("  RiskLens Feature Analysis & EDA")
    print("=" * 60)

    df = load_data()

    print_summary_stats(df)
    plot_class_distribution(df)
    plot_correlation_heatmap(df)
    plot_boxplots(df)

    print("\n" + "=" * 60)
    print("  EDA complete. Review plots before running train.py.")
    print("  Key things to check:")
    print("  → class_distribution.png    — classes should be roughly equal")
    print("  → correlation_heatmap.png   — no feature > 0.95 corr with label")
    print("  → boxplots_by_class.png     — distributions should separate by class")
    print("=" * 60)


if __name__ == "__main__":
    main()
