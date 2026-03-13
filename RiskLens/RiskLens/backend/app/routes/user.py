from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User

user_bp = Blueprint('user', __name__)


def _identity_as_int():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get user profile"""
    user_id = _identity_as_int()
    if user_id is None:
        return jsonify({'error': 'Invalid authentication token'}), 401
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200


@user_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    from flask import request
    
    user_id = _identity_as_int()
    if user_id is None:
        return jsonify({'error': 'Invalid authentication token'}), 401
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if 'display_name' in data:
        user.display_name = data['display_name']
    
    if 'avatar_url' in data:
        user.avatar_url = data['avatar_url']
    
    db.session.commit()
    
    return jsonify({'user': user.to_dict()}), 200


@user_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get user stats (LeetCode-like)"""
    user_id = _identity_as_int()
    if user_id is None:
        return jsonify({'error': 'Invalid authentication token'}), 401
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'problems_solved': user.problems_solved,
        'ranking': user.ranking
    }), 200
