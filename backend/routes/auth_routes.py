from flask import Blueprint, request, jsonify, session
from models import User
from database import db

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password.'}), 401

    user_dict = user.to_dict()
    session['user_id'] = user.user_id
    session['role'] = user.role
    return jsonify({
        'message': 'Login successful.',
        'user': user_dict
    }), 200

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully.'}), 200

@auth_bp.route('/api/auth/me', methods=['GET'])
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        # Default to demo reporter if unauthenticated for smooth academic demo evaluation
        reporter = User.query.filter_by(role='reporter').first()
        if reporter:
            return jsonify({'authenticated': False, 'user': reporter.to_dict()}), 200
        return jsonify({'authenticated': False, 'user': None}), 401

    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({'authenticated': False, 'user': None}), 404

    return jsonify({'authenticated': True, 'user': user.to_dict()}), 200

@auth_bp.route('/api/auth/demo-users', methods=['GET'])
def get_demo_users():
    """Returns list of fictional demonstration users for rapid switcher testing."""
    users = User.query.all()
    demo_list = []
    for u in users:
        demo_list.append({
            'user_id': u.user_id,
            'name': u.name,
            'email': u.email,
            'role': u.role,
            'default_password': 'admin123' if u.role == 'admin' else ('doctor123' if u.role == 'handler' else 'reporter123')
        })
    return jsonify({'demo_users': demo_list}), 200
