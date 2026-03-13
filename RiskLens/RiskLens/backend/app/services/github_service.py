"""
github_service.py
Fetches all GitHub data needed to build the risk feature vector.
All functions take github_token as first argument.
"""

import requests
from datetime import datetime, timezone
import math

GITHUB_API = "https://api.github.com"

def _headers(token):
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

def get_repos(token):
    """List all repos the authenticated user has access to."""
    resp = requests.get(
        f"{GITHUB_API}/user/repos",
        headers=_headers(token),
        params={"sort": "updated", "per_page": 50, "affiliation": "owner,collaborator"}
    )
    if resp.status_code != 200:
        return []
    return [
        {"id": r["id"], "name": r["name"], "full_name": r["full_name"],
         "private": r["private"], "updated_at": r["updated_at"]}
        for r in resp.json()
    ]

def get_commits(token, repo_full_name, days=7):
    """Fetch commits for a repo over the last N days."""
    since = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    from datetime import timedelta
    since = since - timedelta(days=days)
    resp = requests.get(
        f"{GITHUB_API}/repos/{repo_full_name}/commits",
        headers=_headers(token),
        params={"since": since.isoformat(), "per_page": 100}
    )
    if resp.status_code != 200:
        return []
    commits = []
    for c in resp.json():
        dt_str = c.get("commit", {}).get("author", {}).get("date", "")
        commits.append({
            "sha": c["sha"],
            "author": c.get("author", {}).get("login", "unknown") if c.get("author") else "unknown",
            "message": c.get("commit", {}).get("message", ""),
            "timestamp": dt_str,
        })
    return commits

def get_open_pulls(token, repo_full_name):
    """Fetch open pull requests with size and metadata."""
    resp = requests.get(
        f"{GITHUB_API}/repos/{repo_full_name}/pulls",
        headers=_headers(token),
        params={"state": "open", "per_page": 30}
    )
    if resp.status_code != 200:
        return []
    pulls = []
    for pr in resp.json():
        pulls.append({
            "id": pr["number"],
            "title": pr["title"],
            "author": pr.get("user", {}).get("login", "unknown"),
            "created_at": pr["created_at"],
            "additions": pr.get("additions", 0),
            "deletions": pr.get("deletions", 0),
            "changed_files": pr.get("changed_files", 0),
            "draft": pr.get("draft", False),
            "labels": [l["name"] for l in pr.get("labels", [])],
        })
    return pulls

def get_pr_reviews(token, repo_full_name, pr_number):
    """Fetch reviews for a specific PR."""
    resp = requests.get(
        f"{GITHUB_API}/repos/{repo_full_name}/pulls/{pr_number}/reviews",
        headers=_headers(token),
        params={"per_page": 50}
    )
    if resp.status_code != 200:
        return []
    return [
        {
            "reviewer": r.get("user", {}).get("login", "unknown"),
            "state": r["state"],
            "submitted_at": r["submitted_at"],
        }
        for r in resp.json()
    ]

def get_pr_comments(token, repo_full_name, pr_number):
    """Fetch review comments (back-and-forth) for a PR."""
    resp = requests.get(
        f"{GITHUB_API}/repos/{repo_full_name}/pulls/{pr_number}/comments",
        headers=_headers(token),
        params={"per_page": 100}
    )
    if resp.status_code != 200:
        return []
    return resp.json()

def get_workflow_runs(token, repo_full_name, days=7):
    """Fetch recent CI/CD workflow runs."""
    resp = requests.get(
        f"{GITHUB_API}/repos/{repo_full_name}/actions/runs",
        headers=_headers(token),
        params={"per_page": 50}
    )
    if resp.status_code != 200:
        return []
    runs = []
    for r in resp.json().get("workflow_runs", []):
        runs.append({
            "id": r["id"],
            "name": r.get("name", ""),
            "status": r["status"],
            "conclusion": r.get("conclusion"),
            "created_at": r["created_at"],
            "updated_at": r.get("updated_at"),
        })
    return runs

def get_contributors(token, repo_full_name):
    """Fetch contributor commit counts."""
    resp = requests.get(
        f"{GITHUB_API}/repos/{repo_full_name}/contributors",
        headers=_headers(token),
        params={"per_page": 30}
    )
    if resp.status_code != 200:
        return []
    return [
        {"login": c.get("login", "unknown"), "contributions": c.get("contributions", 0)}
        for c in resp.json()
    ]

# ── Feature computation helpers ───────────────────────────────────────────────

def compute_night_commit_ratio(commits):
    """Fraction of commits pushed between 10 PM and 6 AM."""
    if not commits:
        return 0.0
    night = 0
    for c in commits:
        try:
            dt = datetime.fromisoformat(c["timestamp"].replace("Z", "+00:00"))
            if dt.hour >= 22 or dt.hour < 6:
                night += 1
        except Exception:
            pass
    return round(night / len(commits), 4)

def compute_commit_velocity_spike(commits_7d, commits_30d):
    """7-day commit count / 30-day rolling average (per 7 days)."""
    avg_30d_per_week = (commits_30d / 30) * 7 if commits_30d > 0 else 1
    return round(len(commits_7d) / avg_30d_per_week, 4)

def compute_review_gap_hours(pr_created_at, reviews):
    """Hours between PR open and first review comment."""
    if not reviews:
        return 72.0  # no reviews = high gap
    try:
        pr_dt = datetime.fromisoformat(pr_created_at.replace("Z", "+00:00"))
        first_review_dt = min(
            datetime.fromisoformat(r["submitted_at"].replace("Z", "+00:00"))
            for r in reviews
        )
        delta = (first_review_dt - pr_dt).total_seconds() / 3600
        return round(max(delta, 0), 4)
    except Exception:
        return 24.0

def compute_ci_failure_streak(runs):
    """Count consecutive failed workflow runs from most recent."""
    streak = 0
    for run in runs:
        if run["conclusion"] in ("failure", "timed_out"):
            streak += 1
        elif run["conclusion"] == "success":
            break
    return streak

def compute_ci_pass_rate_7d(runs):
    """Pass rate of workflow runs in last 7 days."""
    completed = [r for r in runs if r["conclusion"] in ("success", "failure", "timed_out")]
    if not completed:
        return 1.0
    passed = sum(1 for r in completed if r["conclusion"] == "success")
    return round(passed / len(completed), 4)

def compute_cross_team_files_ratio(pr_files, author_login, recent_commits):
    """
    Estimate ratio of files outside author's primary module.
    Uses file path prefixes: files in paths the author hasn't touched before = cross-team.
    """
    if not pr_files or pr_files == 0:
        return 0.0
    # Simple heuristic: if PR touches many files, higher cross-team probability
    if pr_files > 20:
        return min(0.9, pr_files / 50)
    if pr_files > 10:
        return min(0.6, pr_files / 30)
    return min(0.3, pr_files / 20)

def is_hotfix_pr(pr_title, pr_labels):
    """Check if PR title or labels indicate a hotfix."""
    keywords = ["hotfix", "urgent", "critical", "emergency", "patch"]
    title_lower = pr_title.lower()
    label_names = [l.lower() for l in pr_labels]
    return int(
        any(k in title_lower for k in keywords) or
        any(k in l for k in keywords for l in label_names)
    )
