# models.py
import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())

    # Relationship - Each user has one portfolio
    portfolio = db.relationship('Portfolio', uselist=False, back_populates='user')

class Portfolio(db.Model):
    __tablename__ = 'portfolios'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship - A portfolio has many holdings & transactions
    user = db.relationship('User', back_populates='portfolio')
    holdings = db.relationship('PortfolioHolding', back_populates='portfolio', cascade='all, delete-orphan')
    transactions = db.relationship('Transaction', back_populates='portfolio', cascade='all, delete-orphan')

class PortfolioHolding(db.Model):
    __tablename__ = 'portfolio_holdings'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    portfolio_id = db.Column(db.String(36), db.ForeignKey('portfolios.id', ondelete='CASCADE'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    shares = db.Column(db.Numeric(12,2), nullable=False, default=0, index=True)  # Index added for fast lookups
    average_cost = db.Column(db.Numeric(12,2), nullable=False, default=0)
    book_value = db.Column(db.Numeric(12,2), nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship - Belongs to a portfolio
    portfolio = db.relationship('Portfolio', back_populates='holdings')

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    portfolio_id = db.Column(db.String(36), db.ForeignKey('portfolios.id', ondelete='CASCADE'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    shares = db.Column(db.Numeric(12,2), nullable=False)  # Prevent negative shares
    price = db.Column(db.Numeric(12,2), nullable=False)  # Prevent negative price
    transaction_type = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())

    # Relationship - Belongs to a portfolio
    portfolio = db.relationship('Portfolio', back_populates='transactions')

class Watchlist(db.Model):
    __tablename__ = 'watchlist'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)