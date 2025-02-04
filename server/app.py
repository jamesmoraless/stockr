import uuid  # Needed for generating user IDs
from flask import Flask, jsonify, request, g
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
import os
from firebase_admin import credentials, auth
from finvizfinance.quote import finvizfinance
import requests  # if needed for other endpoints
from finvizfinance.calendar import Calendar  # Add this import at the top

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {
        "origins": "http://localhost:3000",  # Frontend URL
        "allow_headers": ["Authorization", "Content-Type"],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"]
    }},
    supports_credentials=True  # Only if using cookies/sessions
)

# Hardcoded connection string (ensure these values match your docker-compose/postgres setup)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')


db = SQLAlchemy(app)
firebase_cred_path = os.getenv('FIREBASE_CREDENTIALS', 'path/to/default.json')
# Firebase setup: Replace the details with your actual Firebase service account information.
cred = credentials.Certificate(firebase_cred_path)
firebase_admin.initialize_app(cred)



# Models
# users is good
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())
    # Additional fields can be added as needed

# watchlist is broken
class Watchlist(db.Model):
    __tablename__ = 'watchlist'
    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())



# Auth middleware: Ensure endpoints that require authentication have a valid Firebase ID token
@app.before_request
def authenticate():
    if request.method == "OPTIONS":
        return  # Skip auth for preflight
    # Endpoints that require authentication
    if request.endpoint in ['get_watchlist', 'add_to_watchlist', 'delete_from_watchlist']:
        auth_header = request.headers.get('Authorization')
        if not auth_header or 'Bearer ' not in auth_header:
            return jsonify({"error": "Unauthorized"}), 401

        id_token = auth_header.split('Bearer ')[1]
        try:
            decoded_token = auth.verify_id_token(id_token)
            # Look up the user in the database using the Firebase UID
            g.user = User.query.filter_by(firebase_uid=decoded_token['uid']).first()
            if not g.user:
                return jsonify({"error": "User not found"}), 401
        except Exception as e:
            return jsonify({"error": str(e)}), 401

def get_finviz_data(ticker):
    """
    Uses the finvizfinance library to get ticker data.
    """
    try:
        stock = finvizfinance(ticker)
        data = {
            "fundamentals": stock.ticker_fundament(),
            "description": stock.ticker_description(),
            "outer_ratings": stock.ticker_outer_ratings(),
            "news": stock.ticker_news(),
            # Uncomment the next line if you wish to download and save the chart image.
            # "charts": stock.TickerCharts(out_dir='asset')
        }
        return data
    except Exception as e:
        return {"error": str(e)}

# API Endpoints
@app.route('/api/calendar', methods=['GET'])
def get_economic_calendar():
    return jsonify({"message": "FinViz Stock Watchlist API is running!"})

@app.route('/')
def home():
    return jsonify({"message": "FinViz Stock Watchlist API is running!"})

@app.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    """
    Retrieve the watchlist for the authenticated user along with Finviz data for each ticker.
    """
    watchlist_items = Watchlist.query.filter_by(user_id=g.user.id).all()
    response = [{
        'id': item.id,
        'ticker': item.ticker,
        'data': get_finviz_data(item.ticker)
    } for item in watchlist_items]
    return jsonify(response)

@app.route('/api/watchlist', methods=['POST'])
def add_to_watchlist():
    """
    Add a new ticker to the authenticated user's watchlist.
    """
    data = request.get_json()
    if not data or 'ticker' not in data:
        return jsonify({"error": "Ticker is required"}), 400

    ticker = data['ticker'].upper()

    # Create a new Watchlist record
    new_item = Watchlist(
        user_id=g.user.id,
        ticker=ticker
    )
    db.session.add(new_item)
    db.session.commit()
    return jsonify({"message": "Added to watchlist", "id": new_item.id}), 201

@app.route('/api/watchlist/<string:item_id>', methods=['DELETE'])
def delete_from_watchlist(item_id):
    """
    Delete a ticker from the authenticated user's watchlist.
    """
    item = Watchlist.query.filter_by(id=item_id, user_id=g.user.id).first()
    if not item:
        return jsonify({"error": "Watchlist item not found"}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Deleted from watchlist"}), 200

@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        print("Received data:", data)  # 👈 Add logging

        if not data or 'firebase_uid' not in data:
            return jsonify({"error": "Firebase UID is required"}), 400

        # Check for existing user first
        existing_user = User.query.filter_by(firebase_uid=data['firebase_uid']).first()
        if existing_user:
            return jsonify({"message": "User already exists", "id": existing_user.id}), 200

        new_user = User(
            id=str(uuid.uuid4()),
            firebase_uid=data['firebase_uid']
        )
        db.session.add(new_user)
        db.session.commit()
        print("User created successfully:", new_user.id)  # 👈 Add logging
        return jsonify({"message": "User created", "id": new_user.id}), 201

    except Exception as e:
        print("Error creating user:", str(e))  # 👈 Critical error logging
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # For development purposes only. In production, use a WSGI server.
    app.run(host='0.0.0.0', port=5000, debug=True)
