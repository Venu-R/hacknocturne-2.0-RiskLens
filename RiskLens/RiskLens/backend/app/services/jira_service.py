"""
jira_service.py
Fetches sprint tickets, deadlines, and assignee workload from Jira Cloud.
All functions take jira_token and cloud_id as first two arguments.
"""

import requests
from datetime import datetime, timezone, timedelta

ATLASSIAN_API = "https://api.atlassian.com"

def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

def get_accessible_resources(token):
    """Get list of Jira cloud sites the user has access to."""
    resp = requests.get(
        f"{ATLASSIAN_API}/oauth/token/accessible-resources",
        headers=_headers(token)
    )
    if resp.status_code != 200:
        return []
    return resp.json()

def get_projects(token, cloud_id):
    """List accessible Jira projects."""
    resp = requests.get(
        f"{ATLASSIAN_API}/ex/jira/{cloud_id}/rest/api/3/project/search",
        headers=_headers(token),
        params={"maxResults": 50}
    )
    if resp.status_code != 200:
        return []
    return [
        {"id": p["id"], "key": p["key"], "name": p["name"]}
        for p in resp.json().get("values", [])
    ]

def get_active_sprint_issues(token, cloud_id, project_key=None):
    """Fetch all open/in-progress issues from active sprints."""
    jql = "sprint in openSprints() AND statusCategory != Done"
    if project_key:
        jql = f"project = {project_key} AND {jql}"

    resp = requests.get(
        f"{ATLASSIAN_API}/ex/jira/{cloud_id}/rest/api/3/search",
        headers=_headers(token),
        params={
            "jql": jql,
            "maxResults": 100,
            "fields": "summary,assignee,duedate,status,priority,labels,issuetype"
        }
    )
    if resp.status_code != 200:
        return []

    issues = []
    for issue in resp.json().get("issues", []):
        fields = issue.get("fields", {})
        assignee = fields.get("assignee")
        issues.append({
            "id": issue["id"],
            "key": issue["key"],
            "summary": fields.get("summary", ""),
            "assignee": assignee.get("displayName", "Unassigned") if assignee else "Unassigned",
            "assignee_account_id": assignee.get("accountId") if assignee else None,
            "due_date": fields.get("duedate"),
            "status": fields.get("status", {}).get("name", ""),
            "priority": fields.get("priority", {}).get("name", "Medium"),
        })
    return issues

def get_my_issues(token, cloud_id):
    """Fetch issues assigned to the authenticated user."""
    resp = requests.get(
        f"{ATLASSIAN_API}/ex/jira/{cloud_id}/rest/api/3/search",
        headers=_headers(token),
        params={
            "jql": "assignee = currentUser() AND statusCategory != Done ORDER BY duedate ASC",
            "maxResults": 50,
            "fields": "summary,duedate,status,priority"
        }
    )
    if resp.status_code != 200:
        return []

    issues = []
    for issue in resp.json().get("issues", []):
        fields = issue.get("fields", {})
        issues.append({
            "id": issue["id"],
            "key": issue["key"],
            "summary": fields.get("summary", ""),
            "due_date": fields.get("duedate"),
            "status": fields.get("status", {}).get("name", ""),
            "priority": fields.get("priority", {}).get("name", "Medium"),
        })
    return issues

def get_deadline_pressure(issues):
    """
    Categorize issues by deadline proximity.
    Returns counts for 24h, 48h, 72h windows.
    """
    now = datetime.now(timezone.utc)
    critical = []   # due within 24h
    warning = []    # due within 24–48h
    upcoming = []   # due within 48–72h

    for issue in issues:
        due = issue.get("due_date")
        if not due:
            continue
        try:
            due_dt = datetime.fromisoformat(due).replace(tzinfo=timezone.utc)
            delta_hours = (due_dt - now).total_seconds() / 3600
            if 0 <= delta_hours <= 24:
                critical.append(issue)
            elif 24 < delta_hours <= 48:
                warning.append(issue)
            elif 48 < delta_hours <= 72:
                upcoming.append(issue)
        except Exception:
            pass

    return {
        "critical": critical,
        "warning": warning,
        "upcoming": upcoming,
        "deadline_24h_count": len(critical),
        "deadline_48h_count": len(warning),
    }

def get_assignee_workload(issues):
    """Count open tickets per assignee."""
    workload = {}
    for issue in issues:
        assignee = issue.get("assignee", "Unassigned")
        if assignee not in workload:
            workload[assignee] = {"open_tickets": 0, "overdue": 0}
        workload[assignee]["open_tickets"] += 1

        due = issue.get("due_date")
        if due:
            try:
                due_dt = datetime.fromisoformat(due).replace(tzinfo=timezone.utc)
                if due_dt < datetime.now(timezone.utc):
                    workload[assignee]["overdue"] += 1
            except Exception:
                pass

    return [
        {"assignee": k, "open_tickets": v["open_tickets"], "overdue": v["overdue"]}
        for k, v in workload.items()
    ]
