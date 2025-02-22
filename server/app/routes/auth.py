# app/routes/auth.py
from flask import Blueprint, request, jsonify, g
import uuid
from ..models import User, Portfolio
from ..models import db

bp = Blueprint('auth', __name__)

@bp.route('/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        if not data or 'firebase_uid' not in data:
            return jsonify({"error": "Firebase UID is required"}), 400

        existing_user = User.query.filter_by(firebase_uid=data['firebase_uid']).first()
        if existing_user:
            portfolio = Portfolio.query.filter_by(user_id=existing_user.id).first()
            return jsonify({
                "message": "User already exists",
                "user_id": existing_user.id,
                "portfolio_id": portfolio.id if portfolio else None
            }), 200

        new_user = User(firebase_uid=data['firebase_uid'])
        db.session.add(new_user)
        db.session.commit()

        new_portfolio = Portfolio(user_id=new_user.id)
        db.session.add(new_portfolio)
        db.session.commit()

        return jsonify({
            "message": "User created",
            "user_id": new_user.id,
            "portfolio_id": new_portfolio.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
