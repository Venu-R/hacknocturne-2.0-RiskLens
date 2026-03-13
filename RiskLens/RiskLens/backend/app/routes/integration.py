"""
integration.py
All integration routes: GitHub data, Jira data, and /api/predict.
Register this blueprint in app.py.
"""

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.services.github_service import (
    get_repos, get_commits, get_open_pulls,
    get_pr_reviews, get_workflow_runs, get_contributors
)
from app.services.jira_service import (
    get_accessible_resources, get_projects,
    get_active_sprint_issues, get_my_issues,
    get_deadline_pressure, get_assignee_workload
)
from app.services.aggregator import build_feature_vector
from app.services.alerter import send_slack_alert
from app.ml.predictor import predict_risk
import os

integration_bp = Blueprint('integration', __name__)


def _get_user(user_id):
    try:
        return User.query.get(int(user_id))
    except (TypeError, ValueError):
        return None


# ═══════════════════════════════════════════════════════════
# GITHUB ENDPOINTS
# ═══════════════════════════════════════════════════════════

@integration_bp.route('/api/github/repos', methods=['GET'])
@jwt_required()
def github_repos():
    user = _get_user(get_jwt_identity())
    if not user or not user.github_token:
        return jsonify({'error': 'GitHub not connected'}), 401
    repos = get_repos(user.github_token)
    return jsonify({'repos': repos})


@integration_bp.route('/api/github/commits', methods=['GET'])
@jwt_required()
def github_commits():
    user = _get_user(get_jwt_identity())
    if not user or not user.github_token:
        return jsonify({'error': 'GitHub not connected'}), 401
    repo = request.args.get('repo')
    days = int(request.args.get('days', 7))
    if not repo:
        return jsonify({'error': 'repo parameter required'}), 400
    commits = get_commits(user.github_token, repo, days=days)
    return jsonify({'commits': commits})


@integration_bp.route('/api/github/pulls', methods=['GET'])
@jwt_required()
def github_pulls():
    user = _get_user(get_jwt_identity())
    if not user or not user.github_token:
        return jsonify({'error': 'GitHub not connected'}), 401
    repo = request.args.get('repo')
    if not repo:
        return jsonify({'error': 'repo parameter required'}), 400
    pulls = get_open_pulls(user.github_token, repo)
    return jsonify({'pulls': pulls})


@integration_bp.route('/api/github/cicd', methods=['GET'])
@jwt_required()
def github_cicd():
    user = _get_user(get_jwt_identity())
    if not user or not user.github_token:
        return jsonify({'error': 'GitHub not connected'}), 401
    repo = request.args.get('repo')
    if not repo:
        return jsonify({'error': 'repo parameter required'}), 400
    runs = get_workflow_runs(user.github_token, repo)
    return jsonify({'runs': runs})


@integration_bp.route('/api/github/contributors', methods=['GET'])
@jwt_required()
def github_contributors():
    user = _get_user(get_jwt_identity())
    if not user or not user.github_token:
        return jsonify({'error': 'GitHub not connected'}), 401
    repo = request.args.get('repo')
    if not repo:
        return jsonify({'error': 'repo parameter required'}), 400
    contributors = get_contributors(user.github_token, repo)
    return jsonify({'contributors': contributors})


# ═══════════════════════════════════════════════════════════
# JIRA ENDPOINTS
# ═══════════════════════════════════════════════════════════

@integration_bp.route('/api/jira/sites', methods=['GET'])
@jwt_required()
def jira_sites():
    user = _get_user(get_jwt_identity())
    if not user or not user.jira_token:
        return jsonify({'error': 'Jira not connected'}), 401
    sites = get_accessible_resources(user.jira_token)
    return jsonify({'sites': sites})


@integration_bp.route('/api/jira/projects', methods=['GET'])
@jwt_required()
def jira_projects():
    user = _get_user(get_jwt_identity())
    if not user or not user.jira_token:
        return jsonify({'error': 'Jira not connected'}), 401
    cloud_id = request.args.get('cloud_id') or user.jira_cloud_id
    if not cloud_id:
        return jsonify({'error': 'cloud_id required'}), 400
    projects = get_projects(user.jira_token, cloud_id)
    return jsonify({'projects': projects})


@integration_bp.route('/api/jira/sprint', methods=['GET'])
@jwt_required()
def jira_sprint():
    user = _get_user(get_jwt_identity())
    if not user or not user.jira_token:
        return jsonify({'error': 'Jira not connected'}), 401
    cloud_id = request.args.get('cloud_id') or user.jira_cloud_id
    project_key = request.args.get('project')
    if not cloud_id:
        return jsonify({'error': 'cloud_id required'}), 400
    issues = get_active_sprint_issues(user.jira_token, cloud_id, project_key)
    return jsonify({'issues': issues})


@integration_bp.route('/api/jira/my-issues', methods=['GET'])
@jwt_required()
def jira_my_issues():
    user = _get_user(get_jwt_identity())
    if not user or not user.jira_token:
        return jsonify({'error': 'Jira not connected'}), 401
    cloud_id = request.args.get('cloud_id') or user.jira_cloud_id
    if not cloud_id:
        return jsonify({'error': 'cloud_id required'}), 400
    issues = get_my_issues(user.jira_token, cloud_id)
    deadlines = get_deadline_pressure(issues)
    workload = get_assignee_workload(issues)
    return jsonify({
        'issues': issues,
        'deadline_pressure': deadlines,
        'workload': workload,
    })


# ═══════════════════════════════════════════════════════════
# INTEGRATION STATUS
# ═══════════════════════════════════════════════════════════

@integration_bp.route('/api/integrations/status', methods=['GET'])
@jwt_required()
def integration_status():
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'github': bool(user.github_token),
        'jira':   bool(user.jira_token),
        'slack':  bool(os.environ.get('SLACK_WEBHOOK_URL')),
        'slack_channel': os.environ.get('SLACK_CHANNEL_NAME', '#risklens-alerts'),
        'github_user': user.username if user.github_token else None,
        'jira_site':   user.jira_cloud_id if user.jira_token else None,
    })


# ═══════════════════════════════════════════════════════════
# PREDICT ENDPOINT — THE CORE ML ENDPOINT
# ═══════════════════════════════════════════════════════════

@integration_bp.route('/api/predict', methods=['POST'])
@jwt_required()
def predict():
    """
    Compute SFRI risk score for a developer + repo context.
    Body: { "repo": "owner/repo-name" }
    Optionally: { "repo": "...", "cloud_id": "..." }
    """
    user = _get_user(get_jwt_identity())
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if not user.github_token:
        return jsonify({'error': 'GitHub not connected. Please connect GitHub first.'}), 401

    data = request.get_json() or {}
    repo = data.get('repo')
    if not repo:
        return jsonify({'error': 'repo is required'}), 400

    cloud_id = data.get('cloud_id') or user.jira_cloud_id

    try:
        # Build feature vector from live data
        features = build_feature_vector(
            github_token=user.github_token,
            jira_token=user.jira_token,
            jira_cloud_id=cloud_id,
            repo_full_name=repo,
            developer_login=user.username,
        )

        # Run ML inference
        result = predict_risk(features)

        # Fire Slack alert if score exceeds threshold
        threshold = int(os.environ.get('SLACK_ALERT_THRESHOLD', 75))
        alert_sent = False
        if result['score'] >= threshold and os.environ.get('SLACK_WEBHOOK_URL'):
            alert_result = send_slack_alert(
                developer=user.username,
                repo=repo,
                score=result['score'],
                level=result['level'],
                top_factors=result['top_factors'],
                recommendation=result['recommendation'],
            )
            alert_sent = alert_result.get('sent', False)

        return jsonify({
            'score':          result['score'],
            'level':          result['level'],
            'top_factors':    result['top_factors'],
            'recommendation': result['recommendation'],
            'features':       features,
            'alert_sent':     alert_sent,
            'repo':           repo,
            'developer':      user.username,
        })

    except Exception as e:
        current_app.logger.error(f"Predict error: {e}")
        return jsonify({'error': str(e)}), 500


@integration_bp.route('/api/team-risk', methods=['GET'])
@jwt_required()
def team_risk():
    """
    Get aggregate risk for all contributors of a repo.
    Query param: repo=owner/repo-name
    """
    user = _get_user(get_jwt_identity())
    if not user or not user.github_token:
        return jsonify({'error': 'GitHub not connected'}), 401

    repo = request.args.get('repo')
    if not repo:
        return jsonify({'error': 'repo parameter required'}), 400

    contributors = get_contributors(user.github_token, repo)
    cloud_id = user.jira_cloud_id

    members = []
    total_score = 0

    for contributor in contributors[:10]:  # limit to top 10
        login = contributor['login']
        try:
            commits_7d  = get_commits(user.github_token, repo, days=7)
            commits_30d = get_commits(user.github_token, repo, days=30)
            dev_7d  = [c for c in commits_7d  if c['author'] == login]
            dev_30d = [c for c in commits_30d if c['author'] == login]

            pulls = get_open_pulls(user.github_token, repo)
            dev_pulls = [p for p in pulls if p['author'] == login]

            import math
            features = {
                'night_commit_ratio':      _night_ratio(dev_7d),
                'pr_lines_changed':        dev_pulls[0]['additions'] + dev_pulls[0]['deletions'] if dev_pulls else 0,
                'pr_files_changed':        dev_pulls[0]['changed_files'] if dev_pulls else 0,
                'review_gap_hours':        0.0,
                'review_depth_score':      0.0,
                'consecutive_ci_failures': 0,
                'ci_pass_rate_7d':         1.0,
                'deadline_24h_count':      0,
                'deadline_48h_count':      0,
                'open_ticket_count':       0,
                'commit_velocity_spike':   len(dev_7d) / max((len(dev_30d) / 30 * 7), 1),
                'cross_team_files_ratio':  0.0,
                'test_file_updated':       1,
                'hotfix_label_present':    0,
            }
            result = predict_risk(features)
            members.append({
                'login': login,
                'score': result['score'],
                'level': result['level'],
                'commits_7d': len(dev_7d),
            })
            total_score += result['score']
        except Exception:
            members.append({'login': login, 'score': 0, 'level': 'LOW', 'commits_7d': 0})

    team_score = round(total_score / len(members)) if members else 0
    return jsonify({
        'team_score': team_score,
        'members': members,
        'repo': repo,
    })


def _night_ratio(commits):
    from datetime import datetime
    if not commits:
        return 0.0
    night = sum(
        1 for c in commits
        if _parse_hour(c.get('timestamp', '')) in range(0, 6)
        or _parse_hour(c.get('timestamp', '')) >= 22
    )
    return round(night / len(commits), 4)

def _parse_hour(ts):
    try:
        return datetime.fromisoformat(ts.replace('Z', '+00:00')).hour
    except Exception:
        return 12
