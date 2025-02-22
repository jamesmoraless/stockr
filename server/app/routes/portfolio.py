# app/routes/portfolio.py
from flask import Blueprint, jsonify, request, g
import uuid
from ..models import Portfolio, PortfolioHolding, Transaction
from ..models import db

bp = Blueprint('portfolio', __name__)

def recalc_portfolio(portfolio_id, ticker):
    transactions = Transaction.query.filter_by(portfolio_id=portfolio_id, ticker=ticker).all()
    total_shares = 0
    total_cost = 0.0
    for txn in transactions:
        txn_shares = float(txn.shares)
        txn_price = float(txn.price)
        if txn.transaction_type.lower() == 'buy':
            total_shares += txn_shares
            total_cost += txn_shares * txn_price
        elif txn.transaction_type.lower() == 'sell' and total_shares >= txn_shares:
            avg_cost_per_share = total_cost / total_shares if total_shares > 0 else 0
            total_shares -= txn_shares
            total_cost -= txn_shares * avg_cost_per_share
    new_book_value = max(0, total_cost)
    new_avg_cost = (new_book_value / total_shares) if total_shares > 0 else 0
    portfolio_entry = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id, ticker=ticker).first()
    if portfolio_entry:
        if total_shares > 0:
            portfolio_entry.shares = total_shares
            portfolio_entry.average_cost = new_avg_cost
            portfolio_entry.book_value = new_book_value
        else:
            db.session.delete(portfolio_entry)
    else:
        if total_shares > 0:
            new_portfolio_entry = PortfolioHolding(
                portfolio_id=portfolio_id,
                ticker=ticker,
                shares=total_shares,
                average_cost=new_avg_cost,
                book_value=new_book_value
            )
            db.session.add(new_portfolio_entry)
    db.session.commit()

@bp.route('/<string:portfolio_id>', methods=['GET'])
def get_portfolio(portfolio_id):
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401
        portfolio = Portfolio.query.filter_by(id=portfolio_id, user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found or unauthorized"}), 404
        portfolio_entries = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
        portfolio_list = [{
            "ticker": entry.ticker,
            "shares": float(entry.shares),
            "average_cost": float(entry.average_cost) if entry.average_cost is not None else 0,
            "book_value": float(entry.book_value) if entry.book_value is not None else 0,
            "market_value": 0  # Placeholder if market value is computed elsewhere
        } for entry in portfolio_entries]
        return jsonify({"portfolio": portfolio_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/buy', methods=['POST'])
def buy_asset():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided."}), 400
    ticker = data.get('ticker')
    shares = data.get('shares')
    price = data.get('price')
    if not ticker or shares is None or price is None:
        return jsonify({"error": "Ticker, shares, and price are required."}), 400
    ticker = ticker.upper()
    try:
        user = g.user
        portfolio = Portfolio.query.filter_by(user_id=user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found"}), 404
        new_txn = Transaction(
            portfolio_id=portfolio.id,
            ticker=ticker,
            shares=shares,
            price=price,
            transaction_type="buy"
        )
        db.session.add(new_txn)
        db.session.commit()
        recalc_portfolio(portfolio.id, ticker)
        return jsonify({"message": "Asset purchased successfully.", "ticker": ticker}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/sell', methods=['POST'])
def sell_asset():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided."}), 400
    ticker = data.get('ticker')
    shares = data.get('shares')
    price = data.get('price')
    if not ticker or shares is None or price is None:
        return jsonify({"error": "Ticker, shares, and price are required."}), 400
    ticker = ticker.upper()
    try:
        user = g.user
        portfolio = Portfolio.query.filter_by(user_id=user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found"}), 404
        holding = PortfolioHolding.query.filter_by(portfolio_id=portfolio.id, ticker=ticker).first()
        if not holding or holding.shares < shares:
            return jsonify({"error": "Not enough shares to sell."}), 400
        new_txn = Transaction(
            portfolio_id=portfolio.id,
            ticker=ticker,
            shares=shares,
            price=price,
            transaction_type="sell"
        )
        db.session.add(new_txn)
        db.session.commit()
        recalc_portfolio(portfolio.id, ticker)
        return jsonify({"message": "Asset sold successfully.", "ticker": ticker}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/<string:portfolio_id>/add-asset', methods=['POST'])
def add_portfolio_asset(portfolio_id):
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided."}), 400
        ticker = data.get('ticker')
        shares = data.get('shares')
        price = data.get('price')
        transaction_type = data.get('transaction_type', 'buy').lower()
        if not ticker or shares is None or price is None:
            return jsonify({"error": "Ticker, shares, and price are required."}), 400
        ticker = ticker.upper()
        portfolio = Portfolio.query.filter_by(id=portfolio_id, user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found or unauthorized"}), 404
        new_txn = Transaction(
            portfolio_id=portfolio.id,
            ticker=ticker,
            shares=shares,
            price=price,
            transaction_type=transaction_type
        )
        db.session.add(new_txn)
        recalc_portfolio(portfolio.id, ticker)
        db.session.commit()
        return jsonify({"message": "Transaction recorded and portfolio updated successfully."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@bp.route('/<string:portfolio_id>/sell-asset', methods=['POST'])
def sell_portfolio_asset(portfolio_id):
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided."}), 400
        ticker = data.get('ticker')
        shares = data.get('shares')
        price = data.get('price')
        if not ticker or shares is None or price is None:
            return jsonify({"error": "Ticker, shares, and price are required."}), 400
        ticker = ticker.upper()
        portfolio = Portfolio.query.filter_by(id=portfolio_id, user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found or unauthorized"}), 404
        portfolio_entry = PortfolioHolding.query.filter_by(portfolio_id=portfolio.id, ticker=ticker).first()
        if not portfolio_entry or portfolio_entry.shares < shares:
            return jsonify({"error": "Insufficient shares to sell"}), 400
        new_txn = Transaction(
            portfolio_id=portfolio.id,
            ticker=ticker,
            shares=shares,
            price=price,
            transaction_type="sell"
        )
        db.session.add(new_txn)
        recalc_portfolio(portfolio.id, ticker)
        db.session.commit()
        return jsonify({"message": "Transaction recorded and portfolio updated successfully."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@bp.route('/graph/<string:portfolio_id>', methods=['GET'])
def get_portfolio_for_graph(portfolio_id):
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401
        portfolio = Portfolio.query.filter_by(id=portfolio_id, user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found or unauthorized"}), 404
        portfolio_entries = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
        portfolio_list = [{
            "ticker": entry.ticker,
            "book_value": float(entry.book_value) if entry.book_value is not None else 0
        } for entry in portfolio_entries]
        return jsonify({"portfolio": portfolio_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/id', methods=['GET'])
def get_portfolio_id():
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401
        portfolio = Portfolio.query.filter_by(user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found"}), 404
        return jsonify({"portfolio_id": portfolio.id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
