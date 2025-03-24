# app.py
from flask import Flask
from flask_cors import CORS
from config import Config
from models import db
import firebase_admin
from firebase_admin import credentials
from routes import register_routes
from sqlalchemy import inspect
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

with app.app_context():
    # Check if tables exist before trying to create them
    inspector = inspect(db.engine)
    existing_tables = inspector.get_table_names()

    # Create models that don't exist yet
    for table in db.metadata.tables.values():
        if table.name not in existing_tables:
            table.create(db.engine, checkfirst=True)
        else:
            print(f"Table {table.name} already exists")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
