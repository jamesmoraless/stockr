import os
import json
from flask import Flask
from flask_cors import CORS
from config import Config
from models import db
import firebase_admin
from firebase_admin import credentials, initialize_app
from routes import register_routes
from sqlalchemy import inspect


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Setup CORS
    CORS(
        app,
        resources={r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "https://stockr-frontend-production.up.railway.app",
                "https://www.stockr.info"
            ],
            "allow_headers": ["Authorization", "Content-Type"],
            "methods": ["GET", "POST", "DELETE", "OPTIONS"]
        }},
        supports_credentials=True
    )

    # Initialize the database
    db.init_app(app)

    # Initialize Firebase using credentials from the environment variable.
    # It first attempts to parse the value as JSON.
    firebase_creds_raw = app.config.get('FIREBASE_CREDENTIALS')
    try:
        # Attempt to parse the environment variable as JSON.
        firebase_creds_dict = json.loads(firebase_creds_raw)
        cred = credentials.Certificate(firebase_creds_dict)
    except json.JSONDecodeError:
        # If parsing fails, treat it as a file path.
        cred = credentials.Certificate(firebase_creds_raw)

    firebase_admin.initialize_app(cred)

    # Register routes
    register_routes(app)
    return app


# Create the app at the module level so that gunicorn can find it
app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    existing_tables = inspector.get_table_names()
    for table in db.metadata.tables.values():
        if table.name not in existing_tables:
            table.create(db.engine, checkfirst=True)
        else:
            print(f"Table {table.name} already exists")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
