# app/routes/transactions.py
from flask import Blueprint, jsonify, request, g
from ..models import Transaction, PortfolioHolding, Portfolio
from ..models import db

bp = Blueprint('transactions', __name__)

@bp.route('', methods=['GET'])
def get_transactions():
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401
        portfolio = Portfolio.query.filter_by(user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found"}), 404
        transactions = Transaction.query.filter_by(portfolio_id=portfolio.id).order_by(Transaction.created_at.desc()).limit(15).all()
        transactions_list = [{
            "id": txn.id,
            "ticker": txn.ticker,
            "shares": float(txn.shares),
            "price": float(txn.price),
            "transaction_type": txn.transaction_type,
            "created_at": txn.created_at.isoformat()
        } for txn in transactions]
        return jsonify({"transactions": transactions_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/<string:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401
        portfolio = Portfolio.query.filter_by(user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found"}), 404
        transaction = Transaction.query.filter_by(id=transaction_id, portfolio_id=portfolio.id).first()
        if not transaction:
            return jsonify({"error": "Transaction not found"}), 404
        ticker = transaction.ticker
        shares = float(transaction.shares)
        price = float(transaction.price)
        total_value = shares * price
        holding = PortfolioHolding.query.filter_by(portfolio_id=portfolio.id, ticker=ticker).first()
        if transaction.transaction_type.lower() == 'buy':
            if holding:
                holding.shares -= shares
                holding.book_value -= total_value
                if holding.shares <= 0:
                    db.session.delete(holding)
        elif transaction.transaction_type.lower() == 'sell':
            if holding:
                holding.shares += shares
                holding.book_value += total_value
            else:
                new_holding = PortfolioHolding(
                    portfolio_id=portfolio.id,
                    ticker=ticker,
                    shares=shares,
                    average_cost=price,
                    book_value=total_value
                )
                db.session.add(new_holding)
        db.session.delete(transaction)
        db.session.commit()
        return jsonify({
            "message": "Transaction deleted successfully.",
            "updated_portfolio": {
                "ticker": ticker,
                "shares": float(holding.shares) if holding else 0,
                "book_value": float(holding.book_value) if holding else 0
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
