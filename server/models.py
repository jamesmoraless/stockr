# models.py
import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False)
    cash_balance = db.Column(db.Numeric(12,2), nullable=False, default=0.00)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())

class Watchlist(db.Model):
    __tablename__ = 'watchlist'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Portfolio(db.Model):
    __tablename__ = 'portfolio'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    shares = db.Column(db.Numeric(12,2), nullable=False)
    average_cost = db.Column(db.Numeric(12,2))
    market_value = db.Column(db.Numeric(12,2))
    book_value = db.Column(db.Numeric(12,2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    shares = db.Column(db.Numeric(12,2), nullable=False)
    price = db.Column(db.Numeric(12,2), nullable=False)
    # Use 'buy' or 'sell' to indicate the type of transaction.
    transaction_type = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())
