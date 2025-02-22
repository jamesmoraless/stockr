# app/middleware.py
from flask import request, jsonify, g
from firebase_admin import auth
from .models import User

def authenticate():
    if request.method == "OPTIONS":
        return
    # Require authentication for all routes starting with /api
    if not request.path.startswith('/api/'):
        return
    auth_header = request.headers.get('Authorization')
    if not auth_header or 'Bearer ' not in auth_header:
        return jsonify({"error": "Unauthorized"}), 401
    id_token = auth_header.split('Bearer ')[1]
    try:
        decoded_token = auth.verify_id_token(id_token)
        g.user = User.query.filter_by(firebase_uid=decoded_token['uid']).first()
        if not g.user:
            return jsonify({"error": "User not found"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 401