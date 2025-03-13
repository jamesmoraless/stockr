# app.py
from flask import Flask
from flask_cors import CORS
from config import Config
from models import db
import firebase_admin
from firebase_admin import credentials
from routes import register_routes
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Setup CORS
    CORS(
        app,
        resources={r"/api/*": {
            "origins": "http://localhost:3000",
            "allow_headers": ["Authorization", "Content-Type"],
            "methods": ["GET", "POST", "DELETE", "OPTIONS"]
        }},
        supports_credentials=True
    )

    # Initialize the database
    db.init_app(app)

    # Initialize Firebase using the credentials from config
    firebase_cred_path = app.config.get('FIREBASE_CREDENTIALS')
    cred = credentials.Certificate(firebase_cred_path)
    firebase_admin.initialize_app(cred)

    # Register routes (all endpoints and before_request logic)
    register_routes(app)
    return app

# Create the app at the module level so that gunicorn can find it
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
