from app import db
from flask_login import UserMixin


class User(db.Model, UserMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=True)  # Nullable for OAuth users
    
    # OAuth fields
    github_id = db.Column(db.String(100), unique=True, nullable=True)
    github_token = db.Column(db.Text, nullable=True)
    jira_id = db.Column(db.String(100), unique=True, nullable=True)
    jira_token = db.Column(db.Text, nullable=True)
    jira_refresh_token = db.Column(db.Text, nullable=True)
    
    # Profile
    avatar_url = db.Column(db.String(500), nullable=True)
    display_name = db.Column(db.String(100), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Stats (LeetCode-like)
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
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class OAuthState(db.Model):
    """Store OAuth state for CSRF protection"""
    __tablename__ = 'oauth_states'

    id = db.Column(db.Integer, primary_key=True)
    state = db.Column(db.String(100), unique=True, nullable=False)
    provider = db.Column(db.String(50), nullable=False)  # 'github' or 'jira'
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    expires_at = db.Column(db.DateTime, nullable=False)
