import os
from flask import Flask, jsonify, send_from_directory, redirect
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_jwt_extended import JWTManager
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import re
from email_validator import validate_email, EmailNotValidError
import requests
import secrets
from urllib.parse import urlencode

from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BACKEND_DIR, '.env'))
load_dotenv(os.path.join(BACKEND_DIR, 'env'))

from app import db, login_manager, jwt
from app.models import User, OAuthState

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///risklens_dev.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = 24 * 60 * 60
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '')
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '')
    GITHUB_REDIRECT_URI = os.environ.get('GITHUB_REDIRECT_URI', 'http://127.0.0.1:5000/auth/callback/github')
    JIRA_CLIENT_ID = os.environ.get('JIRA_CLIENT_ID', '')
    JIRA_CLIENT_SECRET = os.environ.get('JIRA_CLIENT_SECRET', '')
    JIRA_REDIRECT_URI = os.environ.get('JIRA_REDIRECT_URI', 'http://127.0.0.1:5000/auth/callback/jira')
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    CORS_ALLOWED_ORIGINS = [
        origin.strip() for origin in os.environ.get(
            'CORS_ALLOWED_ORIGINS',
            f"{FRONTEND_URL},http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000,http://127.0.0.1:5000"
        ).split(',') if origin.strip()
    ]


def create_app():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    static_folder = os.path.join(project_root, 'frontend', 'dist')

    app = Flask(__name__, static_folder=static_folder, static_url_path='/static')
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app, origins=app.config.get('CORS_ALLOWED_ORIGINS', []), supports_credentials=True)
    login_manager.init_app(app)
    jwt.init_app(app)

    # ── Register integration blueprint ────────────────────────────────────────
    from app.routes.integration import integration_bp
    app.register_blueprint(integration_bp)

    # ── Auth Routes ───────────────────────────────────────────────────────────

    def _identity_as_int():
        try:
            return int(get_jwt_identity())
        except (TypeError, ValueError):
            return None

    @app.route('/api/auth/signup', methods=['POST'])
    def signup():
        from flask import request
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        if not email or not username or not password:
            return jsonify({'error': 'All fields are required'}), 400
        try:
            validate_email(email)
        except EmailNotValidError as e:
            return jsonify({'error': str(e)}), 400
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
            return jsonify({'error': 'Username must be 3-20 characters, alphanumeric and underscores only'}), 400
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        if User.query.filter((User.email == email) | (User.username == username)).first():
            return jsonify({'error': 'Email or username already exists'}), 409
        user = User(
            email=email, username=username,
            password_hash=generate_password_hash(password), display_name=username
        )
        db.session.add(user)
        db.session.commit()
        access_token = create_access_token(identity=str(user.id))
        return jsonify({'message': 'User created successfully', 'user': user.to_dict(), 'token': access_token}), 201

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        from flask import request
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        user = User.query.filter_by(email=email).first()
        if not user or not user.password_hash:
            return jsonify({'error': 'Invalid email or password'}), 401
        if not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid email or password'}), 401
        user.last_login = datetime.utcnow()
        db.session.commit()
        access_token = create_access_token(identity=str(user.id))
        return jsonify({'message': 'Login successful', 'user': user.to_dict(), 'token': access_token}), 200

    @app.route('/api/auth/me', methods=['GET'])
    @jwt_required()
    def get_current_user():
        user_id = _identity_as_int()
        if user_id is None:
            return jsonify({'error': 'Invalid authentication token'}), 401
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'user': user.to_dict()}), 200

    @app.route('/api/auth/logout', methods=['POST'])
    @jwt_required()
    def logout():
        return jsonify({'message': 'Logged out successfully'}), 200

    # ── OAuth helpers ──────────────────────────────────────────────────────────

    def generate_state(provider):
        state = secrets.token_urlsafe(32)
        oauth_state = OAuthState(
            state=state, provider=provider,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        db.session.add(oauth_state)
        db.session.commit()
        return state

    def validate_state(state, provider):
        oauth_state = OAuthState.query.filter_by(state=state, provider=provider).first()
        if not oauth_state or oauth_state.expires_at < datetime.utcnow():
            return False
        db.session.delete(oauth_state)
        db.session.commit()
        return True

    # ── GitHub OAuth ───────────────────────────────────────────────────────────

    @app.route('/api/auth/github')
    def github_login():
        if not app.config['GITHUB_CLIENT_ID']:
            return jsonify({'error': 'GitHub OAuth not configured'}), 500
        state = generate_state('github')
        params = {
            'client_id': app.config['GITHUB_CLIENT_ID'],
            'redirect_uri': app.config['GITHUB_REDIRECT_URI'],
            'scope': 'user:email read:user repo',
            'state': state,
            'prompt': 'select_account'
        }
        return redirect(f"https://github.com/login/oauth/authorize?{urlencode(params)}")

    @app.route('/api/auth/github/callback')
    @app.route('/auth/callback/github')
    @app.route('/auth/github/callback')
    def github_callback():
        from flask import request
        oauth_error = request.args.get('error')
        code = request.args.get('code')
        state = request.args.get('state')
        if oauth_error:
            return redirect(f"{app.config['FRONTEND_URL']}/login?error=github_access_denied")
        if not validate_state(state, 'github'):
            return redirect(f"{app.config['FRONTEND_URL']}/login?error=invalid_state")
        token_response = requests.post(
            'https://github.com/login/oauth/access_token',
            headers={'Accept': 'application/json'},
            data={
                'client_id': app.config['GITHUB_CLIENT_ID'],
                'client_secret': app.config['GITHUB_CLIENT_SECRET'],
                'code': code,
                'redirect_uri': app.config['GITHUB_REDIRECT_URI']
            }
        )
        token_data = token_response.json()
        if 'error' in token_data:
            return redirect(f"{app.config['FRONTEND_URL']}/login?error=oauth_failed")
        access_token = token_data.get('access_token')
        user_data = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f'token {access_token}'}
        ).json()
        emails = requests.get(
            'https://api.github.com/user/emails',
            headers={'Authorization': f'token {access_token}'}
        ).json()
        primary_email = next((e['email'] for e in emails if e.get('primary')), user_data.get('email'))
        github_id = str(user_data['id'])
        user = User.query.filter_by(github_id=github_id).first()
        if not user:
            user = User.query.filter_by(email=primary_email).first()
            if user:
                user.github_id = github_id
                user.github_token = access_token
                if not user.avatar_url:
                    user.avatar_url = user_data.get('avatar_url')
            else:
                username = user_data.get('login', f"github_{github_id}")
                base = username
                counter = 1
                while User.query.filter_by(username=username).first():
                    username = f"{base}_{counter}"
                    counter += 1
                user = User(
                    email=primary_email, username=username,
                    github_id=github_id, github_token=access_token,
                    avatar_url=user_data.get('avatar_url'),
                    display_name=user_data.get('name') or username
                )
                db.session.add(user)
        else:
            user.github_token = access_token
            user.last_login = datetime.utcnow()
        db.session.commit()
        jwt_token = create_access_token(identity=str(user.id))
        return redirect(f"{app.config['FRONTEND_URL']}/auth/callback?token={jwt_token}")

    # ── Jira OAuth ─────────────────────────────────────────────────────────────

    @app.route('/api/auth/jira')
    def jira_login():
        if not app.config['JIRA_CLIENT_ID']:
            return jsonify({'error': 'Jira OAuth not configured'}), 500
        state = generate_state('jira')
        # Keep default scopes login-safe. Product/site scopes can be added via JIRA_OAUTH_SCOPES.
        jira_scopes = os.environ.get('JIRA_OAUTH_SCOPES', 'read:me')
        params = {
            'audience': 'api.atlassian.com',
            'client_id': app.config['JIRA_CLIENT_ID'],
            'scope': jira_scopes,
            'redirect_uri': app.config['JIRA_REDIRECT_URI'],
            'state': state,
            'response_type': 'code',
            'prompt': 'login consent'
        }
        return redirect(f"https://auth.atlassian.com/authorize?{urlencode(params)}")

    @app.route('/api/auth/jira/callback')
    @app.route('/auth/callback/jira')
    @app.route('/auth/jira/callback')
    def jira_callback():
        from flask import request
        oauth_error = request.args.get('error')
        code = request.args.get('code')
        state = request.args.get('state')
        if oauth_error:
            error_description = request.args.get('error_description', '')
            if 'permission' in error_description.lower() or 'access' in error_description.lower():
                return redirect(f"{app.config['FRONTEND_URL']}/login?error=jira_site_access_required")
            return redirect(f"{app.config['FRONTEND_URL']}/login?error=jira_access_denied")
        if not validate_state(state, 'jira'):
            return redirect(f"{app.config['FRONTEND_URL']}/login?error=invalid_state")
        token_response = requests.post(
            'https://auth.atlassian.com/oauth/token',
            json={
                'grant_type': 'authorization_code',
                'client_id': app.config['JIRA_CLIENT_ID'],
                'client_secret': app.config['JIRA_CLIENT_SECRET'],
                'code': code,
                'redirect_uri': app.config['JIRA_REDIRECT_URI']
            }
        )
        token_data = token_response.json()
        if 'error' in token_data:
            return redirect(f"{app.config['FRONTEND_URL']}/login?error=oauth_failed")
        access_token = token_data.get('access_token')
        refresh_token = token_data.get('refresh_token')

        # Get user profile
        user_data = requests.get(
            'https://api.atlassian.com/me',
            headers={'Authorization': f'Bearer {access_token}'}
        ).json()

        # Get cloud site ID — save it on the user
        sites = requests.get(
            'https://api.atlassian.com/oauth/token/accessible-resources',
            headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'}
        ).json()
        cloud_id = sites[0]['id'] if sites else None

        jira_id = user_data.get('account_id')
        email = user_data.get('email')
        display_name = user_data.get('name', '')
        avatar_url = user_data.get('picture', '')

        user = User.query.filter_by(jira_id=jira_id).first()
        if not user:
            user = User.query.filter_by(email=email).first()
            if user:
                user.jira_id = jira_id
                user.jira_token = access_token
                user.jira_refresh_token = refresh_token
                user.jira_cloud_id = cloud_id  # ← SAVE CLOUD ID
            else:
                username = email.split('@')[0] if email else f"jira_{jira_id}"
                base = username
                counter = 1
                while User.query.filter_by(username=username).first():
                    username = f"{base}_{counter}"
                    counter += 1
                user = User(
                    email=email or f"{jira_id}@jira.placeholder",
                    username=username, jira_id=jira_id,
                    jira_token=access_token, jira_refresh_token=refresh_token,
                    jira_cloud_id=cloud_id,  # ← SAVE CLOUD ID
                    avatar_url=avatar_url,
                    display_name=display_name or username
                )
                db.session.add(user)
        else:
            user.jira_token = access_token
            user.jira_refresh_token = refresh_token
            user.jira_cloud_id = cloud_id  # ← SAVE CLOUD ID
            user.last_login = datetime.utcnow()
        db.session.commit()
        jwt_token = create_access_token(identity=str(user.id))
        return redirect(f"{app.config['FRONTEND_URL']}/auth/callback?token={jwt_token}")

    # ── Serve React ────────────────────────────────────────────────────────────

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        if path.startswith('api/'):
            return jsonify({'error': 'API endpoint not found'}), 404
        if not app.static_folder or not os.path.exists(app.static_folder):
            return jsonify({'error': 'Frontend not built. Run npm run build in frontend directory.'}), 500
        if path:
            file_path = os.path.join(app.static_folder, path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                return send_from_directory(app.static_folder, path)
        index_path = os.path.join(app.static_folder, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({'error': 'Frontend not found'}), 500

    with app.app_context():
        db.create_all()
        print("Database tables created!")

    return app


app = create_app()

if __name__ == '__main__':
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', '5000'))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    print("\nStarting RiskLens Server...")
    print(f"API:      http://localhost:{port}/api")
    print("Frontend: Set FRONTEND_URL and CORS_ALLOWED_ORIGINS for your deployed app\n")
    app.run(host=host, port=port, debug=debug)
