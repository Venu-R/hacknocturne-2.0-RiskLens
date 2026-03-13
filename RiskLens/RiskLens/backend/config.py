import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Database - PostgreSQL (Supabase/Neon/Railway etc.)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://user:password@localhost/risklens')
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
    CORS_ORIGINS = [FRONTEND_URL]
