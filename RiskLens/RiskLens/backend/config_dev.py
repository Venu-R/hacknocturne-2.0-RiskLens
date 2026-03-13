import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))
load_dotenv(os.path.join(BASE_DIR, 'env'))

class Config:
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Database - SQLite for development
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///risklens_dev.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = 24 * 60 * 60  # 24 hours
    
    # GitHub OAuth
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '')
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '')
    GITHUB_REDIRECT_URI = os.environ.get('GITHUB_REDIRECT_URI', 'http://localhost:5000/api/auth/github/callback')
    
    # Jira OAuth (Atlassian)
    JIRA_CLIENT_ID = os.environ.get('JIRA_CLIENT_ID', '')
    JIRA_CLIENT_SECRET = os.environ.get('JIRA_CLIENT_SECRET', '')
    JIRA_REDIRECT_URI = os.environ.get('JIRA_REDIRECT_URI', 'http://localhost:5000/api/auth/jira/callback')
    
    # Frontend URL
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    
    # CORS
    CORS_ALLOWED_ORIGINS = [
        origin.strip() for origin in os.environ.get(
            'CORS_ALLOWED_ORIGINS',
            f"{FRONTEND_URL},http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000,http://127.0.0.1:5000"
        ).split(',') if origin.strip()
    ]
