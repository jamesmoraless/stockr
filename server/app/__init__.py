# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import firebase_admin
from firebase_admin import credentials

from .config import Config
from .models import db
from .middleware import authenticate

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    CORS(
        app,
        resources={r"/api/*": {"origins": "http://localhost:3000"}},
        supports_credentials=True
    )

    # Initialize Firebase
    firebase_cred_path = app.config.get('FIREBASE_CREDENTIALS')
    cred = credentials.Certificate(firebase_cred_path)
    firebase_admin.initialize_app(cred)

    # Register blueprints
    from .routes import auth, stocks, portfolio, transactions, watchlist, news
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(stocks.bp, url_prefix='/api/stocks')
    app.register_blueprint(portfolio.bp, url_prefix='/api/portfolio')
    app.register_blueprint(transactions.bp, url_prefix='/api/transactions')
    app.register_blueprint(watchlist.bp, url_prefix='/api/watchlist')
    app.register_blueprint(news.bp, url_prefix='/api/news')

    # Public home route
    @app.route('/')
    def home():
        return {"message": "FinViz Stock Watchlist API is running!"}

    # Register authentication middleware for all /api routes
    app.before_request(authenticate)

    return app