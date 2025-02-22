# app/routes/watchlist.py
from flask import Blueprint, jsonify, request, g
from ..models import Watchlist
from ..models import db

bp = Blueprint('watchlist', __name__)

@bp.route('', methods=['POST'])
def add_to_watchlist():
    data = request.get_json()
    if not data or 'ticker' not in data:
        return jsonify({"error": "Ticker is required"}), 400
    ticker = data['ticker'].upper()
    try:
        new_watchlist_item = Watchlist(
            user_id=g.user.id,
            ticker=ticker
        )
        db.session.add(new_watchlist_item)
        db.session.commit()
        return jsonify({
            "message": "Ticker added to watchlist",
            "ticker": ticker,
            "user_id": g.user.id,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@bp.route('/stocks', methods=['GET'])
def get_watchlist_stocks():
    try:
        watchlist_items = Watchlist.query.filter_by(user_id=g.user.id).all()
        tickers = [item.ticker for item in watchlist_items]
        stocks_data = []
        # Reuse the fetch_stock_data function from the stocks blueprint
        from .stocks import fetch_stock_data
        for ticker in tickers:
            try:
                stock_data = fetch_stock_data(ticker)
                stocks_data.append(stock_data)
            except Exception as inner_error:
                stocks_data.append({
                    "ticker": ticker,
                    "error": str(inner_error)
                })
        return jsonify(stocks_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/<string:ticker>', methods=['DELETE'])
def delete_from_watchlist(ticker):
    ticker = ticker.upper()
    item = Watchlist.query.filter_by(user_id=g.user.id, ticker=ticker).first()
    if not item:
        return jsonify({"error": "Ticker not found in watchlist"}), 404
    try:
        db.session.delete(item)
        db.session.commit()
        return jsonify({
            "message": "Ticker removed from watchlist",
            "ticker": ticker,
            "user_id": g.user.id,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
