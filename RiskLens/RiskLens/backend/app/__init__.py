from flask import Flask, jsonify, send_from_directory, send_file, request, redirect
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_jwt_extended import JWTManager
from config_dev import Config
import os

db = SQLAlchemy()
login_manager = LoginManager()
jwt = JWTManager()


def create_app(config_class=Config):
    # Get the absolute path to the monorepo package root containing frontend/.
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    static_folder = os.path.join(project_root, 'frontend', 'dist')
    
    app = Flask(__name__, 
                static_folder=static_folder,
                static_url_path='/static')
    app.config.from_object(config_class)

    frontend_url = app.config.get('FRONTEND_URL', 'http://localhost:5173')
    cors_env = os.environ.get('CORS_ALLOWED_ORIGINS', '')
    if cors_env.strip():
        cors_origins = [origin.strip() for origin in cors_env.split(',') if origin.strip()]
    else:
        cors_origins = [frontend_url, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000', 'http://127.0.0.1:5000']

    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=cors_origins, supports_credentials=True)
    login_manager.init_app(app)
    jwt.init_app(app)

    # API Routes
    @app.route('/api')
    def api_info():
        return jsonify({
            'message': 'RiskLens API Server',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'oauth': '/api/auth',
                'user': '/api/user'
            }
        })

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.oauth import oauth_bp
    from app.routes.user import user_bp
    from app.routes.integration import integration_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(oauth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(integration_bp)

    # OAuth callback compatibility aliases for provider console settings.
    @app.route('/auth/callback/github')
    @app.route('/auth/github/callback')
    def github_callback_alias():
        query = request.query_string.decode('utf-8')
        target = '/api/auth/github/callback'
        if query:
            target = f"{target}?{query}"
        return redirect(target)

    @app.route('/auth/callback/jira')
    @app.route('/auth/jira/callback')
    def jira_callback_alias():
        query = request.query_string.decode('utf-8')
        target = '/api/auth/jira/callback'
        if query:
            target = f"{target}?{query}"
        return redirect(target)

    # Serve React frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        # Check if it's an API route
        if path.startswith('api/'):
            return jsonify({'error': 'API endpoint not found'}), 404
        
        # Try to serve static file first
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        
        # Serve index.html for all other routes (React Router)
        return send_from_directory(app.static_folder, 'index.html')

    # Create tables
    with app.app_context():
        db.create_all()

    return app
