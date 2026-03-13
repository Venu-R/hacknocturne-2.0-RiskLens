"""
aggregator.py
Merges raw GitHub and Jira API data into the 14-feature vector
expected by predictor.py / model.pkl.
"""

import math
from app.services.github_service import (
    get_commits, get_open_pulls, get_pr_reviews, get_pr_comments,
    get_workflow_runs, compute_night_commit_ratio, compute_commit_velocity_spike,
    compute_review_gap_hours, compute_ci_failure_streak, compute_ci_pass_rate_7d,
    compute_cross_team_files_ratio, is_hotfix_pr
)
from app.services.jira_service import (
    get_my_issues, get_deadline_pressure
)


def build_feature_vector(github_token, jira_token, jira_cloud_id, repo_full_name, developer_login):
    """
    Builds the complete 14-feature dict for a developer + repo context.
    Called by /api/predict before running ML inference.

    Returns: dict with all 14 feature keys matching FEATURE_NAMES
    """

    # ── 1. GitHub: commits (7d and 30d) ──────────────────────────────────────
    commits_7d  = get_commits(github_token, repo_full_name, days=7)
    commits_30d = get_commits(github_token, repo_full_name, days=30)

    # Filter to this developer's commits
    dev_commits_7d  = [c for c in commits_7d  if c["author"] == developer_login]
    dev_commits_30d = [c for c in commits_30d if c["author"] == developer_login]

    night_commit_ratio   = compute_night_commit_ratio(dev_commits_7d)
    commit_velocity_spike = compute_commit_velocity_spike(dev_commits_7d, len(dev_commits_30d))

    # ── 2. GitHub: open PRs for this developer ───────────────────────────────
    all_prs = get_open_pulls(github_token, repo_full_name)
    dev_prs = [pr for pr in all_prs if pr["author"] == developer_login]

    # Use the most recent open PR for PR-level signals
    if dev_prs:
        latest_pr = dev_prs[0]
        pr_lines_changed = latest_pr["additions"] + latest_pr["deletions"]
        pr_files_changed = latest_pr["changed_files"]
        pr_title         = latest_pr["title"]
        pr_labels        = latest_pr["labels"]
        pr_created_at    = latest_pr["created_at"]
        pr_number        = latest_pr["id"]

        # Reviews and comments for this PR
        reviews  = get_pr_reviews(github_token, repo_full_name, pr_number)
        comments = get_pr_comments(github_token, repo_full_name, pr_number)

        review_gap_hours   = compute_review_gap_hours(pr_created_at, reviews)
        review_depth_score = round(math.log1p(len(comments)), 4)
        test_file_updated  = 1  # default; would need files endpoint to be precise
        hotfix_label_present = is_hotfix_pr(pr_title, pr_labels)
        cross_team_files_ratio = compute_cross_team_files_ratio(
            pr_files_changed, developer_login, dev_commits_7d
        )
    else:
        # No open PR — use safe defaults
        pr_lines_changed       = 0
        pr_files_changed       = 0
        review_gap_hours       = 0.0
        review_depth_score     = 0.0
        test_file_updated      = 1
        hotfix_label_present   = 0
        cross_team_files_ratio = 0.0

    # ── 3. GitHub Actions: CI/CD runs ────────────────────────────────────────
    runs = get_workflow_runs(github_token, repo_full_name)
    consecutive_ci_failures = compute_ci_failure_streak(runs)
    ci_pass_rate_7d         = compute_ci_pass_rate_7d(runs)

    # ── 4. Jira: deadline pressure ────────────────────────────────────────────
    if jira_token and jira_cloud_id:
        my_issues    = get_my_issues(jira_token, jira_cloud_id)
        deadlines    = get_deadline_pressure(my_issues)
        deadline_24h = deadlines["deadline_24h_count"]
        deadline_48h = deadlines["deadline_48h_count"]
        open_tickets = len(my_issues)
    else:
        deadline_24h = 0
        deadline_48h = 0
        open_tickets = 0

    # ── 5. Assemble feature vector ────────────────────────────────────────────
    return {
        "night_commit_ratio":      night_commit_ratio,
        "pr_lines_changed":        pr_lines_changed,
        "pr_files_changed":        pr_files_changed,
        "review_gap_hours":        review_gap_hours,
        "review_depth_score":      review_depth_score,
        "consecutive_ci_failures": consecutive_ci_failures,
        "ci_pass_rate_7d":         ci_pass_rate_7d,
        "deadline_24h_count":      deadline_24h,
        "deadline_48h_count":      deadline_48h,
        "open_ticket_count":       open_tickets,
        "commit_velocity_spike":   commit_velocity_spike,
        "cross_team_files_ratio":  cross_team_files_ratio,
        "test_file_updated":       test_file_updated,
        "hotfix_label_present":    hotfix_label_present,
    }
