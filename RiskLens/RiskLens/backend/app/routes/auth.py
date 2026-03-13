from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
from app.models import User
from email_validator import validate_email, EmailNotValidError
import re

auth_bp = Blueprint('auth', __name__)


def _identity_as_int():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Register a new user with email and password"""
    data = request.get_json()
    
    email = data.get('email', '').strip().lower()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    # Validation
    if not email or not username or not password:
        return jsonify({'error': 'All fields are required'}), 400
    
    # Validate email
    try:
        validate_email(email)
    except EmailNotValidError as e:
        return jsonify({'error': str(e)}), 400
    
    # Validate username (alphanumeric and underscores, 3-20 chars)
    if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
        return jsonify({'error': 'Username must be 3-20 characters, alphanumeric and underscores only'}), 400
    
    # Validate password
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    # Check if user exists
    if User.query.filter((User.email == email) | (User.username == username)).first():
        return jsonify({'error': 'Email or username already exists'}), 409
    
    # Create user
    user = User(
        email=email,
        username=username,
        password_hash=generate_password_hash(password),
        display_name=username
    )
    
    db.session.add(user)
    db.session.commit()
    
    # Create JWT token
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'User created successfully',
        'user': user.to_dict(),
        'token': access_token
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login with email and password"""
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
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # Create JWT token
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'token': access_token
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (client should discard token)"""
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user"""
    user_id = _identity_as_int()
    if user_id is None:
        return jsonify({'error': 'Invalid authentication token'}), 401
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required()
def refresh_token():
    """Refresh JWT token"""
    user_id = _identity_as_int()
    if user_id is None:
        return jsonify({'error': 'Invalid authentication token'}), 401
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    access_token = create_access_token(identity=str(user_id))
    
    return jsonify({'token': access_token}), 200
