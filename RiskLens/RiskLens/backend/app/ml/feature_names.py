# feature_names.py
# ─────────────────────────────────────────────────────────────────────────────
# SINGLE SOURCE OF TRUTH for the RiskLens feature vector order.
# Import FEATURE_NAMES from this file in EVERY script that builds or consumes
# the feature vector: train.py, evaluate.py, predictor.py, aggregator.py
#
# ⚠️  NEVER reorder, rename, add, or remove a feature here without:
#      1. Regenerating training_dataset.csv  (run generate_dataset.py)
#      2. Retraining the model               (run train.py)
#      3. Replacing both model.pkl AND scaler.pkl in backend/app/ml/
# ─────────────────────────────────────────────────────────────────────────────

FEATURE_NAMES = [
    "night_commit_ratio",       # float  | GitHub   | fraction of commits 10 PM–6 AM
    "pr_lines_changed",         # int    | GitHub   | additions + deletions on open PR
    "pr_files_changed",         # int    | GitHub   | distinct files touched in PR
    "review_gap_hours",         # float  | GitHub   | hours between PR open & first review
    "review_depth_score",       # float  | GitHub   | log(1 + back-and-forth comment count)
    "consecutive_ci_failures",  # int    | GH Acts  | streak of failed workflow runs
    "ci_pass_rate_7d",          # float  | GH Acts  | pass count / total runs last 7 days
    "deadline_24h_count",       # int    | Jira     | tickets due within next 24 hours
    "deadline_48h_count",       # int    | Jira     | tickets due in the 24–48 hr window
    "open_ticket_count",        # int    | Jira     | total unresolved tickets for developer
    "commit_velocity_spike",    # float  | GitHub   | 7d commit count / 30d rolling avg
    "cross_team_files_ratio",   # float  | GitHub   | files outside primary module / total
    "test_file_updated",        # binary | GitHub   | 1 if any test file modified in PR
    "hotfix_label_present",     # binary | GitHub   | 1 if PR title has hotfix/urgent/critical
]

# Risk label mapping (used by train.py and predictor.py)
RISK_LABELS = {
    0: "LOW",
    1: "MODERATE",
    2: "HIGH",
    3: "CRITICAL",
}

# Number of features — used for validation in predictor.py
N_FEATURES = len(FEATURE_NAMES)  # must always be 14
