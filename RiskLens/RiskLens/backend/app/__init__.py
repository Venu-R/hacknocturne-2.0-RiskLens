from flask import Flask, jsonify, send_from_directory, send_file
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
    # Get the absolute path to the project root
    project_root = os.path.dirname(os.path.dirname(__file__))
    static_folder = os.path.join(project_root, 'frontend', 'dist')
    
    app = Flask(__name__, 
                static_folder=static_folder,
                static_url_path='')
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=['http://localhost:5000', 'http://127.0.0.1:5000'], supports_credentials=True)
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

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(oauth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/user')

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
