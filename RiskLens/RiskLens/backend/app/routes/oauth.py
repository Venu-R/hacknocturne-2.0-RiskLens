from flask import Blueprint, request, jsonify, redirect, current_app, url_for
from flask_jwt_extended import create_access_token
from app import db
from app.models import User, OAuthState
import requests
import secrets
import os
from datetime import datetime, timedelta
from urllib.parse import urlencode

oauth_bp = Blueprint('oauth', __name__)


def generate_state(provider):
    """Generate and store OAuth state for CSRF protection"""
    state = secrets.token_urlsafe(32)
    oauth_state = OAuthState(
        state=state,
        provider=provider,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.session.add(oauth_state)
    db.session.commit()
    return state


def validate_state(state, provider):
    """Validate OAuth state"""
    oauth_state = OAuthState.query.filter_by(
        state=state,
        provider=provider
    ).first()
    
    if not oauth_state or oauth_state.expires_at < datetime.utcnow():
        return False
    
    # Delete used state
    db.session.delete(oauth_state)
    db.session.commit()
    return True


# ==================== GitHub OAuth ====================

@oauth_bp.route('/github')
def github_login():
    """Initiate GitHub OAuth flow"""
    state = generate_state('github')
    
    params = {
        'client_id': current_app.config['GITHUB_CLIENT_ID'],
        'redirect_uri': current_app.config['GITHUB_REDIRECT_URI'],
        'scope': 'user:email read:user',
        'state': state,
        'prompt': 'select_account'
    }
    
    url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return redirect(url)


@oauth_bp.route('/github/callback')
def github_callback():
    """Handle GitHub OAuth callback"""
    oauth_error = request.args.get('error')
    code = request.args.get('code')
    state = request.args.get('state')

    if oauth_error:
        return redirect(f"{current_app.config['FRONTEND_URL']}/login?error=github_access_denied")
    
    # Validate state
    if not validate_state(state, 'github'):
        return redirect(f"{current_app.config['FRONTEND_URL']}/login?error=invalid_state")
    
    # Exchange code for token
    token_response = requests.post(
        'https://github.com/login/oauth/access_token',
        headers={'Accept': 'application/json'},
        data={
            'client_id': current_app.config['GITHUB_CLIENT_ID'],
            'client_secret': current_app.config['GITHUB_CLIENT_SECRET'],
            'code': code,
            'redirect_uri': current_app.config['GITHUB_REDIRECT_URI']
        }
    )
    
    token_data = token_response.json()
    
    if 'error' in token_data:
        return redirect(f"{current_app.config['FRONTEND_URL']}/login?error=oauth_failed")
    
    access_token = token_data.get('access_token')
    
    # Get user info
    user_response = requests.get(
        'https://api.github.com/user',
        headers={'Authorization': f'token {access_token}'}
    )
    
    user_data = user_response.json()
    
    # Get user email (might be private)
    email_response = requests.get(
        'https://api.github.com/user/emails',
        headers={'Authorization': f'token {access_token}'}
    )
    
    emails = email_response.json()
    primary_email = next(
        (e['email'] for e in emails if e.get('primary')),
        user_data.get('email')
    )
    
    github_id = str(user_data['id'])
    
    # Find or create user
    user = User.query.filter_by(github_id=github_id).first()
    
    if not user:
        # Check if email already exists
        user = User.query.filter_by(email=primary_email).first()
        
        if user:
            # Link GitHub to existing account
            user.github_id = github_id
            user.github_token = access_token
            if not user.avatar_url:
                user.avatar_url = user_data.get('avatar_url')
        else:
            # Create new user
            username = user_data.get('login', f"github_user_{github_id}")
            # Ensure unique username
            base_username = username
            counter = 1
            while User.query.filter_by(username=username).first():
                username = f"{base_username}_{counter}"
                counter += 1
            
            user = User(
                email=primary_email,
                username=username,
                github_id=github_id,
                github_token=access_token,
                avatar_url=user_data.get('avatar_url'),
                display_name=user_data.get('name') or username
            )
            db.session.add(user)
    else:
        # Update existing user
        user.github_token = access_token
        user.last_login = datetime.utcnow()
    
    db.session.commit()
    
    # Create JWT token
    jwt_token = create_access_token(identity=str(user.id))
    
    # Redirect to frontend with token
    return redirect(f"{current_app.config['FRONTEND_URL']}/auth/callback?token={jwt_token}")


# ==================== Jira/Atlassian OAuth ====================

@oauth_bp.route('/jira')
def jira_login():
    """Initiate Jira/Atlassian OAuth flow"""
    state = generate_state('jira')
    # Keep default scopes login-safe. Product/site scopes can be added via JIRA_OAUTH_SCOPES.
    jira_scopes = os.environ.get('JIRA_OAUTH_SCOPES', 'read:me')
    
    params = {
        'audience': 'api.atlassian.com',
        'client_id': current_app.config['JIRA_CLIENT_ID'],
        'scope': jira_scopes,
        'redirect_uri': current_app.config['JIRA_REDIRECT_URI'],
        'state': state,
        'response_type': 'code',
        'prompt': 'login consent'
    }
    
    url = f"https://auth.atlassian.com/authorize?{urlencode(params)}"
    return redirect(url)


@oauth_bp.route('/jira/callback')
def jira_callback():
    """Handle Jira/Atlassian OAuth callback"""
    oauth_error = request.args.get('error')
    code = request.args.get('code')
    state = request.args.get('state')

    if oauth_error:
        error_description = request.args.get('error_description', '')
        if 'permission' in error_description.lower() or 'access' in error_description.lower():
            return redirect(f"{current_app.config['FRONTEND_URL']}/login?error=jira_site_access_required")
        return redirect(f"{current_app.config['FRONTEND_URL']}/login?error=jira_access_denied")
    
    # Validate state
    if not validate_state(state, 'jira'):
        return redirect(f"{current_app.config['FRONTEND_URL']}/login?error=invalid_state")
    
    # Exchange code for token
    token_response = requests.post(
        'https://auth.atlassian.com/oauth/token',
        json={
            'grant_type': 'authorization_code',
            'client_id': current_app.config['JIRA_CLIENT_ID'],
            'client_secret': current_app.config['JIRA_CLIENT_SECRET'],
            'code': code,
            'redirect_uri': current_app.config['JIRA_REDIRECT_URI']
        }
    )
    
    token_data = token_response.json()
    
    if 'error' in token_data:
        return redirect(f"{current_app.config['FRONTEND_URL']}/login?error=oauth_failed")
    
    access_token = token_data.get('access_token')
    refresh_token = token_data.get('refresh_token')
    
    # Get user info from Jira
    user_response = requests.get(
        'https://api.atlassian.com/me',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    user_data = user_response.json()
    
    jira_id = user_data.get('account_id')
    email = user_data.get('email')
    display_name = user_data.get('name', '')
    avatar_url = user_data.get('picture', '')
    
    # Find or create user
    user = User.query.filter_by(jira_id=jira_id).first()
    
    if not user:
        # Check if email already exists
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Link Jira to existing account
            user.jira_id = jira_id
            user.jira_token = access_token
            user.jira_refresh_token = refresh_token
        else:
            # Create new user
            username = email.split('@')[0] if email else f"jira_user_{jira_id}"
            # Ensure unique username
            base_username = username
            counter = 1
            while User.query.filter_by(username=username).first():
                username = f"{base_username}_{counter}"
                counter += 1
            
            user = User(
                email=email or f"{jira_id}@jira.placeholder",
                username=username,
                jira_id=jira_id,
                jira_token=access_token,
                jira_refresh_token=refresh_token,
                avatar_url=avatar_url,
                display_name=display_name or username
            )
            db.session.add(user)
    else:
        # Update existing user
        user.jira_token = access_token
        user.jira_refresh_token = refresh_token
        user.last_login = datetime.utcnow()
    
    db.session.commit()
    
    # Create JWT token
    jwt_token = create_access_token(identity=str(user.id))
    
    # Redirect to frontend with token
    return redirect(f"{current_app.config['FRONTEND_URL']}/auth/callback?token={jwt_token}")


# ==================== Link OAuth to existing account ====================

@oauth_bp.route('/link/github', methods=['POST'])
def link_github():
    """Get GitHub OAuth URL for linking to existing account"""
    from flask_jwt_extended import jwt_required, get_jwt_identity
    
    @jwt_required()
    def _inner():
        state = generate_state('github')
        params = {
            'client_id': current_app.config['GITHUB_CLIENT_ID'],
            'redirect_uri': current_app.config['GITHUB_REDIRECT_URI'],
            'scope': 'user:email read:user',
            'state': state
        }
        url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
        return jsonify({'url': url})
    
    return _inner()


@oauth_bp.route('/link/jira', methods=['POST'])
def link_jira():
    """Get Jira OAuth URL for linking to existing account"""
    from flask_jwt_extended import jwt_required, get_jwt_identity
    
    @jwt_required()
    def _inner():
        state = generate_state('jira')
        params = {
            'audience': 'api.atlassian.com',
            'client_id': current_app.config['JIRA_CLIENT_ID'],
            'scope': 'read:jira-user read:jira-work write:jira-work offline_access',
            'redirect_uri': current_app.config['JIRA_REDIRECT_URI'],
            'state': state,
            'response_type': 'code',
            'prompt': 'consent'
        }
        url = f"https://auth.atlassian.com/authorize?{urlencode(params)}"
        return jsonify({'url': url})
    
    return _inner()
