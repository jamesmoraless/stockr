# app/routes/transactions.py
from flask import Blueprint, jsonify, request, g
from ..models import Transaction, PortfolioHolding, Portfolio
from ..models import db
import pandas as pd
from io import BytesIO
from flask import Blueprint, request, jsonify, g
from werkzeug.utils import secure_filename

from .portfolio import recalc_portfolio
from ..models import db, Transaction, Portfolio
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


DEFAULT_MAPPING = {
    'ticker': ['asset symbol', 'ticker', 'symbol'],
    'shares': ['number of shares', 'shares', 'quantity'],
    'price': ['price', 'price per share', 'buy price', 'purchase price'],
    'transaction_type': ['buy/sell', 'transaction type', 'action']
}


def detect_column(column_list, target_keys):
    """
    Given a list of columns from the file and target synonyms,
    return the matched column name if found.
    """
    for col in column_list:
        normalized = col.strip().lower()
        if normalized in target_keys:
            return col
    return None


def get_mapping(file_columns, user_mapping=None):
    """
    Build a mapping of our expected fields to the actual columns in the file.
    Optionally merge a user-defined mapping over the defaults.
    """
    mapping = {}
    for field, synonyms in DEFAULT_MAPPING.items():
        # If a user mapping is provided, use it; otherwise auto-detect.
        if user_mapping and field in user_mapping:
            mapping[field] = user_mapping[field]
        else:
            detected = detect_column(file_columns, [s.lower() for s in synonyms])
            if not detected:
                raise ValueError(f"Required column for '{field}' not found.")
            mapping[field] = detected
    return mapping

def parse_transactions(file_stream, filename, user_mapping=None):
    """
    Parse an uploaded CSV or Excel file and return a list of transaction dictionaries.
    """
    # Determine file type from filename
    if filename.endswith('.csv'):
        df = pd.read_csv(file_stream)
    elif filename.endswith(('.xls', '.xlsx')):
        df = pd.read_excel(file_stream)
    else:
        raise ValueError("Unsupported file type. Please upload a CSV or Excel file.")

    # Normalize headers
    file_columns = list(df.columns)
    mapping = get_mapping(file_columns, user_mapping)

    transactions = []
    # Iterate over each row and extract the necessary fields.
    for idx, row in df.iterrows():
        try:
            ticker = str(row[mapping['ticker']]).strip().upper()
            shares = float(row[mapping['shares']])
            price = float(row[mapping['price']])
            txn_type_raw = str(row[mapping['transaction_type']]).strip().lower()

            # Normalize transaction type to either 'buy' or 'sell'
            if txn_type_raw in ['buy', 'b', 'purchase']:
                txn_type = 'buy'
            elif txn_type_raw in ['sell', 's']:
                txn_type = 'sell'
            else:
                raise ValueError(f"Unrecognized transaction type: {txn_type_raw}")

            transactions.append({
                'ticker': ticker,
                'shares': shares,
                'price': price,
                'transaction_type': txn_type
            })
        except Exception as e:
            raise ValueError(f"Error processing row {idx + 1}: {e}")
    return transactions


@bp.route('/upload-transactions', methods=['POST'])
def upload_transactions():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    file = request.files['file']
    filename = secure_filename(file.filename)
    if not filename:
        return jsonify({"error": "Invalid file."}), 400

    try:
        # Optionally, you could retrieve a mapping from request.form if provided.
        user_mapping = None  # Example: {'ticker': 'customTickerColumn', ...}
        transactions_data = parse_transactions(file, filename, user_mapping)

        # Assuming your auth middleware sets g.user.
        user = g.user
        if not user:
            return jsonify({"error": "User not authenticated."}), 401

        # Retrieve the user's portfolio.
        portfolio = Portfolio.query.filter_by(user_id=user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found."}), 404

        processed_tickers = set()
        for txn in transactions_data:
            new_txn = Transaction(
                portfolio_id=portfolio.id,
                ticker=txn['ticker'],
                shares=txn['shares'],
                price=txn['price'],
                transaction_type=txn['transaction_type']
            )
            db.session.add(new_txn)
            processed_tickers.add(txn['ticker'])

        db.session.commit()

        # Recalculate portfolio for each ticker affected by the upload.
        for ticker in processed_tickers:
            recalc_portfolio(portfolio.id, ticker)

        return jsonify({"message": "Transactions uploaded successfully."}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400
