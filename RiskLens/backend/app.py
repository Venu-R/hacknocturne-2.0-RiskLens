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

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()  # This will load from .env file in the same directory

# Configuration
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///risklens_dev.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = 24 * 60 * 60
    # GitHub OAuth - Set these in your environment or .env file
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '')
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '')
    GITHUB_REDIRECT_URI = os.environ.get('GITHUB_REDIRECT_URI', 'http://127.0.0.1:5000/auth/callback/github')
    # Jira OAuth
    JIRA_CLIENT_ID = os.environ.get('JIRA_CLIENT_ID', '')
    JIRA_CLIENT_SECRET = os.environ.get('JIRA_CLIENT_SECRET', '')
    JIRA_REDIRECT_URI = os.environ.get('JIRA_REDIRECT_URI', 'http://localhost:5000/api/auth/jira/callback')
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5000')

# Extensions
db = SQLAlchemy()
login_manager = LoginManager()
jwt = JWTManager()

# Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=True)
    github_id = db.Column(db.String(100), unique=True, nullable=True)
    github_token = db.Column(db.Text, nullable=True)
    jira_id = db.Column(db.String(100), unique=True, nullable=True)
    jira_token = db.Column(db.Text, nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    display_name = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    last_login = db.Column(db.DateTime, nullable=True)
    problems_solved = db.Column(db.Integer, default=0)
    ranking = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'avatar_url': self.avatar_url,
            'display_name': self.display_name,
            'problems_solved': self.problems_solved,
            'ranking': self.ranking,
            'has_github': bool(self.github_id),
            'has_jira': bool(self.jira_id),
        }

class OAuthState(db.Model):
    __tablename__ = 'oauth_states'
    id = db.Column(db.Integer, primary_key=True)
    state = db.Column(db.String(100), unique=True, nullable=False)
    provider = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    expires_at = db.Column(db.DateTime, nullable=False)

# Create app
def create_app():
    # Get paths
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    static_folder = os.path.join(project_root, 'frontend', 'dist')
    
    print(f"Backend dir: {backend_dir}")
    print(f"Project root: {project_root}")
    print(f"Static folder: {static_folder}")
    print(f"Static folder exists: {os.path.exists(static_folder)}")
    
    if os.path.exists(static_folder):
        print(f"Static folder contents: {os.listdir(static_folder)}")
    
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=['*'], supports_credentials=True)
    login_manager.init_app(app)
    jwt.init_app(app)

    # ==================== Auth Routes ====================
    
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
            email=email,
            username=username,
            password_hash=generate_password_hash(password),
            display_name=username
        )
        
        db.session.add(user)
        db.session.commit()
        
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict(),
            'token': access_token
        }), 201

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
        
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'token': access_token
        }), 200

    @app.route('/api/auth/me', methods=['GET'])
    @jwt_required()
    def get_current_user():
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200

    @app.route('/api/auth/logout', methods=['POST'])
    @jwt_required()
    def logout():
        return jsonify({'message': 'Logged out successfully'}), 200

    # ==================== OAuth Routes ====================
    
    def generate_state(provider):
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
        from datetime import timedelta
        oauth_state = OAuthState.query.filter_by(state=state, provider=provider).first()
        if not oauth_state or oauth_state.expires_at < datetime.utcnow():
            return False
        db.session.delete(oauth_state)
        db.session.commit()
        return True

    @app.route('/api/auth/github')
    def github_login():
        # Debug: Print environment variables
        print(f"DEBUG: GITHUB_CLIENT_ID = '{app.config['GITHUB_CLIENT_ID']}'")
        print(f"DEBUG: GITHUB_CLIENT_SECRET = '{app.config['GITHUB_CLIENT_SECRET'][:10]}...' if app.config['GITHUB_CLIENT_SECRET'] else 'None'")
        
        # Check if credentials are configured
        if not app.config['GITHUB_CLIENT_ID'] or not app.config['GITHUB_CLIENT_SECRET']:
            return jsonify({
                'error': 'GitHub OAuth not configured',
                'message': 'Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables'
            }), 500
        
        state = generate_state('github')
        params = {
            'client_id': app.config['GITHUB_CLIENT_ID'],
            'redirect_uri': app.config['GITHUB_REDIRECT_URI'],
            'scope': 'user:email read:user',
            'state': state
        }
        url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
        return redirect(url)

    @app.route('/api/auth/github/callback')
    def github_callback():
        from flask import request, redirect
        code = request.args.get('code')
        state = request.args.get('state')
        
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
        
        user_response = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f'token {access_token}'}
        )
        
        user_data = user_response.json()
        
        email_response = requests.get(
            'https://api.github.com/user/emails',
            headers={'Authorization': f'token {access_token}'}
        )
        
        emails = email_response.json()
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
                username = user_data.get('login', f"github_user_{github_id}")
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
            user.github_token = access_token
            user.last_login = datetime.utcnow()
        
        db.session.commit()
        
        jwt_token = create_access_token(identity=user.id)
        
        return redirect(f"{app.config['FRONTEND_URL']}/auth/callback?token={jwt_token}")

    @app.route('/auth/callback/github')
    def github_callback_alt():
        return github_callback()

    @app.route('/api/auth/jira')
    def jira_login():
        state = generate_state('jira')
        params = {
            'audience': 'api.atlassian.com',
            'client_id': app.config['JIRA_CLIENT_ID'],
            'scope': 'read:jira-user read:jira-work write:jira-work offline_access',
            'redirect_uri': app.config['JIRA_REDIRECT_URI'],
            'state': state,
            'response_type': 'code',
            'prompt': 'consent'
        }
        url = f"https://auth.atlassian.com/authorize?{urlencode(params)}"
        return redirect(url)

    @app.route('/api/auth/jira/callback')
    def jira_callback():
        from flask import request, redirect
        code = request.args.get('code')
        state = request.args.get('state')
        
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
        
        user_response = requests.get(
            'https://api.atlassian.com/me',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        user_data = user_response.json()
        
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
            else:
                username = email.split('@')[0] if email else f"jira_user_{jira_id}"
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
            user.jira_token = access_token
            user.jira_refresh_token = refresh_token
            user.last_login = datetime.utcnow()
        
        db.session.commit()
        
        jwt_token = create_access_token(identity=user.id)
        
        return redirect(f"{app.config['FRONTEND_URL']}/auth/callback?token={jwt_token}")

    @app.route('/auth/callback')
    def oauth_callback():
        from flask import request
        token = request.args.get('token')
        
        if not token:
            return jsonify({'error': 'No token provided'}), 400
        
        # Instead of redirecting, serve a simple HTML page that handles the token
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>OAuth Callback</title>
            <script>
                const token = '{token}';
                localStorage.setItem('token', token);
                window.location.href = '/dashboard';
            </script>
        </head>
        <body>
            <p>Redirecting to dashboard...</p>
        </body>
        </html>
        """

    # ==================== User Routes ====================
    
    @app.route('/api/user/profile', methods=['GET'])
    @jwt_required()
    def get_profile():
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200

    # ==================== API Info ====================
    
    @app.route('/api')
    def api_info():
        return jsonify({
            'message': 'RiskLens API Server',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'user': '/api/user'
            }
        })

    # ==================== Serve React ====================
    
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        # API routes return 404
        if path.startswith('api/'):
            return jsonify({'error': 'API endpoint not found'}), 404
        
        # Check if static folder exists
        if not app.static_folder or not os.path.exists(app.static_folder):
            return jsonify({
                'error': 'Frontend not built',
                'message': 'Run "npm run build" in frontend directory'
            }), 500
        
        # Try to serve static file
        if path:
            file_path = os.path.join(app.static_folder, path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                return send_from_directory(app.static_folder, path)
        
        # Serve index.html for React Router
        index_path = os.path.join(app.static_folder, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, 'index.html')
        
        return jsonify({'error': 'Frontend not found'}), 500

    # Create tables
    with app.app_context():
        db.create_all()
        print("Database tables created!")

    return app

# Create and run app
app = create_app()

if __name__ == '__main__':
    print(f"\nStarting RiskLens Server...")
    print(f"Visit http://localhost:5000\n")
    app.run(debug=True, port=5000)
