import uuid  # Needed for generating user IDs
from flask import Flask, jsonify, request, g
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials
import os
from firebase_admin import credentials, auth
from finvizfinance.quote import finvizfinance
from finvizfinance.news import News
import requests  # if needed for other endpoints
from finvizfinance.calendar import Calendar  # Add this import at the top
import pandas as pd
from models import db, User, Watchlist, Portfolio, Transaction


app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {
        "origins": "http://localhost:3000",  # Frontend URL
        "allow_headers": ["Authorization", "Content-Type"],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"]
    }},
    supports_credentials=True  # Only if using cookies/sessions
)

# Hardcoded connection string (ensure these values match your docker-compose/postgres setup)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')


#db = SQLAlchemy(app)
db.init_app(app)
firebase_cred_path = os.getenv('FIREBASE_CREDENTIALS', 'path/to/default.json')
# Firebase setup: Replace the details with your actual Firebase service account information.
cred = credentials.Certificate(firebase_cred_path)
firebase_admin.initialize_app(cred)


def convert_data(data):
    """Convert a pandas DataFrame to a dictionary if needed."""
    if isinstance(data, pd.DataFrame):
        return data.to_dict(orient='records')
    return data



# Auth middleware: Ensure endpoints that require authentication have a valid Firebase ID token
@app.before_request
def authenticate():
    if request.method == "OPTIONS":
        return  # Skip auth for preflight

    # Endpoints that require authentication
    if request.endpoint in ['add_to_watchlist', 'get_watchlist_stocks', 'delete_from_watchlist', 'get_stock_historical', 'get_crypto_historical', 'get_cash_balance', 'add_portfolio_entry', 'deposit_cash', 'withdraw_cash'  ]:
        auth_header = request.headers.get('Authorization')
        if not auth_header or 'Bearer ' not in auth_header:
            return jsonify({"error": "Unauthorized"}), 401

        id_token = auth_header.split('Bearer ')[1]
        try:
            decoded_token = auth.verify_id_token(id_token)
            # Look up the user in the database using the Firebase UID
            g.user = User.query.filter_by(firebase_uid=decoded_token['uid']).first()
            if not g.user:
                return jsonify({"error": "User not found"}), 401
        except Exception as e:
            return jsonify({"error": str(e)}), 401

##Might be worth checking this api endpoint for etf specific data: https://www.alphavantage.co/documentation/#etf-profile
def fetch_stock_data(ticker):
    ticker = ticker.upper()
    stock = finvizfinance(ticker)

    fundamentals_data = convert_data(stock.ticker_fundament())
    if isinstance(fundamentals_data, list) and len(fundamentals_data) > 0:
        fundamentals_data = fundamentals_data[0]

    filtered_fundamentals = {
        "current_price": fundamentals_data.get("Price"),
        "pe_ratio": fundamentals_data.get("P/E"),
        "52_week_high": fundamentals_data.get("52W High"),
        "52_week_low": fundamentals_data.get("52W Low"),
        "lt_debt_equity": fundamentals_data.get("LT Debt/Eq"),
        "price_fcf": fundamentals_data.get("P/FCF"),
        "operating_margin": fundamentals_data.get("Oper. Margin"),
        "beta": fundamentals_data.get("Beta"),
        "company": fundamentals_data.get("Company"),
        "change": fundamentals_data.get("Change"),
        "sector": fundamentals_data.get("Sector"),
        "avg_volume": fundamentals_data.get("Avg Volume"),
        "volume": fundamentals_data.get("Volume")
    }
    # should add EBITDA, EBIT, Market Cap, Revenue, Net Income, Dividend Yield, Profit Margin, QuarterlyEarningsGrowthYOY, QuarterlyRevenueGrowthYOY
    # AnalystTargetPrice,     "AnalystRatingStrongBuy": "2",
    # "AnalystRatingBuy": "5",
    # "AnalystRatingHold": "9",
    # "AnalystRatingSell": "2",
    # "AnalystRatingStrongSell": "1",
    # "EVToRevenue": "4.578",
    # "EVToEBITDA": "23.59",

    return {
        "ticker": ticker,
        "fundamentals": filtered_fundamentals
    }




# API Endpoints
@app.route('/api/calendar', methods=['GET'])
def get_economic_calendar():
    return jsonify({"message": "FinViz Stock Watchlist API is running!"})

@app.route('/')
def home():
    return jsonify({"message": "FinViz Stock Watchlist API is running!"})



"""
@app.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    watchlist_items = Watchlist.query.filter_by(user_id=g.user.id).all()
    response = [{
        'id': item.id,
        'ticker': item.ticker,
        'data': get_finviz_data(item.ticker)
    } for item in watchlist_items]
    return jsonify(response)
"""

"""
@app.route('/api/watchlist', methods=['POST'])
def add_to_watchlist():
    data = request.get_json()
    if not data or 'ticker' not in data:
        return jsonify({"error": "Ticker is required"}), 400

    ticker = data['ticker'].upper()

    # Create a new Watchlist record
    new_item = Watchlist(
        user_id=g.user.id,
        ticker=ticker
    )
    db.session.add(new_item)
    db.session.commit()
    return jsonify({"message": "Added to watchlist", "id": new_item.id}), 201
"""

@app.route('/api/stock/<string:ticker>', methods=['GET'])
def get_stock_data(ticker):
    try:
        # response_data = fetch_stock_data(ticker)
        # fundamentals_data = convert_data(stock.ticker_fundament())
        ticker = ticker.upper()
        stock = finvizfinance(ticker)
        fundamentals_data = convert_data(stock)

        return fundamentals_data, 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/watchlist/stocks', methods=['GET'])
def get_watchlist_stocks():
    try:
        watchlist_items = Watchlist.query.filter_by(user_id=g.user.id).all()
        tickers = [item.ticker for item in watchlist_items]

        stocks_data = []
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

@app.route('/api/watchlist', methods=['POST'])
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

@app.route('/api/watchlist/<string:ticker>', methods=['DELETE'])
def delete_from_watchlist(ticker):
    # Convert the ticker to uppercase for consistency
    ticker = ticker.upper()
    # Find the watchlist item for the current user with the given ticker
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






# FIVIZZZZZZZ FIVIZZZZZZZ FIVIZZZZZZZ FIVIZZZZZZZ FIVIZZZZZZZ FIVIZZZZZZZ FIVIZZZZZZZ FIVIZZZZZZZ FIVIZZZZZZZ FIVIZZZZZZZ FIVIZZZZZZZ

# BELOW IS ALPHAVANTAGE

@app.route('/api/stock/historical/<string:symbol>', methods=['GET'])
def get_stock_historical(symbol):
    """
    Fetches historical weekly adjusted stock price data for the given symbol.
    Returns a JSON object with two arrays: dates and prices.
    """
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'IH7UCOABIKN6Y6KH')
    symbol = symbol.upper()
    url = (
        f'https://www.alphavantage.co/query?'
        f'function=TIME_SERIES_WEEKLY_ADJUSTED&symbol={symbol}&'
        f'outputsize=full&apikey={api_key}'
    )
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an error for HTTP issues
        data = response.json()

        # Check for errors in the response
        if "Error Message" in data:
            return jsonify({"error": data["Error Message"]}), 400
        if "Weekly Adjusted Time Series" not in data:
            return jsonify({"error": "Invalid response from Alpha Vantage"}), 400

        time_series = data["Weekly Adjusted Time Series"]
        # Sort the dates in ascending order
        dates = sorted(time_series.keys())
        # Extract the adjusted close price for each date
        prices = [time_series[date]["5. adjusted close"] for date in dates]

        graph_data = {"dates": dates, "prices": prices}
        return jsonify(graph_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/crypto/historical/<string:symbol>', methods=['GET'])
def get_crypto_historical(symbol):
    """
    Fetches historical daily cryptocurrency price data (in USD) for the given symbol.
    Returns a JSON object with two arrays: dates and prices.
    """
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'IH7UCOABIKN6Y6KH')
    symbol = symbol.upper()
    url = (
        f'https://www.alphavantage.co/query?'
        f'function=DIGITAL_CURRENCY_DAILY&symbol={symbol}&market=USD&apikey={api_key}'
    )

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        # Check for errors in the response
        if "Error Message" in data:
            return jsonify({"error": data["Error Message"]}), 400
        if "Time Series (Digital Currency Daily)" not in data:
            return jsonify({"error": "Invalid response from Alpha Vantage"}), 400

        time_series = data["Time Series (Digital Currency Daily)"]
        # Sort the dates in ascending order
        dates = sorted(time_series.keys())
        # Extract the closing price in USD for each date (using key "4a. close (USD)")
        prices = [time_series[date]["4a. close (USD)"] for date in dates]

        graph_data = {"dates": dates, "prices": prices}
        return jsonify(graph_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/market-news', methods=['GET'])
def get_market_news():
    try:
        news = News()
        news_data = news.get_news()
        news_data_converted = {}
        for key, value in news_data.items():
            if hasattr(value, "to_dict"):
                news_data_converted[key] = value.to_dict(orient='records')
            else:
                news_data_converted[key] = value

        response = {"relevant_news": news_data_converted}
        return jsonify(response), 200    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/ticker-search', methods=['GET'])
def get_ticker():
    keyword = request.args.get('keywords', 'Microsoft')
    
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'IH7UCOABIKN6Y6KH')
    
    url = f'https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords={keyword}&apikey={api_key}'
    r = requests.get(url)
    if r.status_code != 200:
        return jsonify({"error": "Failed to fetch data from Alpha Vantage"}), 500

    data = r.json()
    
    return jsonify(data), 200

@app.route('/api/news-sentiment', methods=['GET'])
def get_news_sentiment():
# The Alpha Vantage API supports the following topics:
# Blockchain: blockchain
# Earnings: earnings
# IPO: ipo
# Mergers & Acquisitions: mergers_and_acquisitions
# Financial Markets: financial_markets
# Economy - Fiscal Policy: economy_fiscal
# Economy - Monetary Policy: economy_monetary
# Economy - Macro/Overall: economy_macro
# Energy & Transportation: energy_transportation
# Finance: finance
# Life Sciences: life_sciences
# Manufacturing: manufacturing
# Real Estate & Construction: real_estate
# Retail & Wholesale: retail_wholesale
# Technology: technology

    tickers = request.args.get('tickers')
    if not tickers:
        return jsonify({"error": "The 'tickers' query parameter is required."}), 400

    topics = request.args.get('topics')

    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'IH7UCOABIKN6Y6KH')

    url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={tickers}'
    
    if topics:
        url += f'&topics={topics}'

    url += f'&apikey={api_key}'
    print(url)

    try:
        response = requests.get(url)
        response.raise_for_status() 
    except requests.RequestException as req_err:
        return jsonify({"error": f"Failed to fetch data from Alpha Vantage: {req_err}"}), 500

    data = response.json()

    return jsonify(data), 200

@app.route('/api/income-statement', methods=['GET'])
def get_income_statement():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "The 'symbol' query parameter is required."}), 400
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'IH7UCOABIKN6Y6KH')

    url = f'https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol={symbol}&apikey={api_key}'

    try:
        response = requests.get(url)
        response.raise_for_status()  
    except requests.RequestException as req_err:
        return jsonify({"error": f"Failed to fetch data from Alpha Vantage: {req_err}"}), 500

    data = response.json()

    return jsonify(data), 200

@app.route('/api/balance-sheet', methods=['GET'])
def get_balance_sheet():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "The 'symbol' query parameter is required."}), 400

    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'IH7UCOABIKN6Y6KH')

    url = f'https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol={symbol}&apikey={api_key}'

    try:
        response = requests.get(url)
        response.raise_for_status()  
    except requests.RequestException as req_err:
        return jsonify({"error": f"Failed to fetch data from Alpha Vantage: {req_err}"}), 500

    data = response.json()

    return jsonify(data), 200

@app.route('/api/cash-flow', methods=['GET'])
def get_cash_flow():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "The 'symbol' query parameter is required."}), 400
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'IH7UCOABIKN6Y6KH')

    url = f'https://www.alphavantage.co/query?function=CASH_FLOW&symbol={symbol}&apikey={api_key}'

    try:
        response = requests.get(url)
        response.raise_for_status()  
    except requests.RequestException as req_err:
        return jsonify({"error": f"Failed to fetch data from Alpha Vantage: {req_err}"}), 500

    data = response.json()

    return jsonify(data), 200
@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401

        portfolio_entries = Portfolio.query.filter_by(user_id=g.user.id).all()
        portfolio_list = [{
            "ticker": entry.ticker,
            "shares": float(entry.shares or 0),
            "average_cost": float(entry.average_cost or 0),
            "book_value": float(entry.book_value or 0),
            "market_value": float(entry.market_value or 0),
        } for entry in portfolio_entries]

        return jsonify({"portfolio": portfolio_list}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/portfolio', methods=['POST'])
def add_portfolio_entry():
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
    cost = float(shares) * float(price)

    try:
        user = g.user  
        # want to ensure the user holds enough shares (handled in your recalc logic)
        if transaction_type == 'buy':
            if float(user.cash_balance) < cost:
                return jsonify({"error": "Insufficient cash balance."}), 400
            user.cash_balance = float(user.cash_balance) - cost
        elif transaction_type == 'sell':
            user.cash_balance = float(user.cash_balance) + cost

        new_txn = Transaction(
            user_id=user.id,
            ticker=ticker,
            shares=shares,
            price=price,
            transaction_type=transaction_type
        )
        db.session.add(new_txn)
        db.session.commit() 

        recalc_portfolio(ticker, user.id)
        portfolio_entry = Portfolio.query.filter_by(user_id=user.id, ticker=ticker).first()

        response_data = {
            "message": "Transaction recorded and portfolio updated successfully.",
            "ticker": ticker,
            "shares": float(portfolio_entry.shares) if portfolio_entry else 0,
            "average_cost": float(portfolio_entry.average_cost) if portfolio_entry else 0,
            "book_value": float(portfolio_entry.book_value) if portfolio_entry else 0,
            "cash_balance": float(user.cash_balance)
        }
        return jsonify(response_data), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/portfolio/graph', methods=['GET'])
def get_portfolio_for_graph():
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401

        portfolio_entries = Portfolio.query.filter_by(user_id=g.user.id).all()
        portfolio_list = [{
            "ticker": entry.ticker,
            "book_value": float(entry.book_value) if entry else 0
        } for entry in portfolio_entries]

        return jsonify({"portfolio": portfolio_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def recalc_portfolio(ticker, user_id):
    transactions = Transaction.query.filter_by(user_id=user_id, ticker=ticker).all()
    
    total_shares = 0
    total_cost = 0.0

    for txn in transactions:
        txn_shares = float(txn.shares)
        txn_price = float(txn.price)
        if txn.transaction_type.lower() == 'buy':
            total_shares += txn_shares
            total_cost += txn_shares * txn_price
        elif txn.transaction_type.lower() == 'sell':
            total_shares -= txn_shares
            total_cost -= txn_shares * txn_price  

    # Calculate weighted average cost if there is a positive holding.
    new_avg_cost = (total_cost / total_shares) if total_shares and total_shares != 0 else 0

    portfolio_entry = Portfolio.query.filter_by(user_id=user_id, ticker=ticker).first()

    if portfolio_entry:
        if total_shares > 0:
            portfolio_entry.shares = total_shares
            portfolio_entry.average_cost = new_avg_cost
            portfolio_entry.book_value = total_shares * new_avg_cost
        else:
            # If no shares remain (or a negative position), remove the portfolio entry.
            db.session.delete(portfolio_entry)
    else:
        if total_shares > 0:
            new_portfolio = Portfolio(
                user_id=user_id,
                ticker=ticker,
                shares=total_shares,
                average_cost=new_avg_cost,
                book_value=total_shares * new_avg_cost
            )
            db.session.add(new_portfolio)
    db.session.commit()

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    try:
        transactions = Transaction.query.filter_by(user_id=g.user.id).order_by(Transaction.created_at.desc()).all()
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

@app.route('/api/transactions/<string:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    try:
        # Look up the transaction for the current user
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=g.user.id).first()
        if not transaction:
            return jsonify({"error": "Transaction not found"}), 404
        
        # Optionally, capture details before deletion (ticker, shares, etc.)
        ticker = transaction.ticker
        # Delete the transaction
        db.session.delete(transaction)
        db.session.commit()
        
        # Recalculate or update the portfolio entry for this ticker
        recalc_portfolio(ticker, g.user.id)
        
        return jsonify({"message": "Transaction deleted successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500



###########################################
@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        print("Received data:", data)

        if not data or 'firebase_uid' not in data:
            return jsonify({"error": "Firebase UID is required"}), 400

        existing_user = User.query.filter_by(firebase_uid=data['firebase_uid']).first()
        if existing_user:
            return jsonify({"message": "User already exists", "id": existing_user.id}), 200

        new_user = User(
            id=str(uuid.uuid4()),
            firebase_uid=data['firebase_uid'],
            cash_balance=0.0 
        )
        db.session.add(new_user)
        db.session.commit()
        print("User created successfully:", new_user.id)
        return jsonify({"message": "User created", "id": new_user.id}), 201

    except Exception as e:
        print("Error creating user:", str(e))
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/cash/balance', methods=['GET'])
def get_cash_balance():
    try:
        print(float(g.user.cash_balance))
        # Assumes that authentication middleware has set g.user
        return jsonify({"cash_balance": float(g.user.cash_balance)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cash/deposit', methods=['POST'])
def deposit_cash():
    data = request.get_json()
    amount = data.get('amount')
    print(amount)
    if not amount or float(amount) <= 0:
        return jsonify({"error": "A valid deposit amount is required."}), 400
    try:
        user = g.user
        user.cash_balance = float(user.cash_balance) + float(amount)
        db.session.commit()
        return jsonify({
            "message": "Deposit successful.",
            "cash_balance": float(user.cash_balance)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/cash/withdraw', methods=['POST'])
def withdraw_cash():
    data = request.get_json()
    amount = data.get('amount')
    if not amount or float(amount) <= 0:
        return jsonify({"error": "A valid withdrawal amount is required."}), 400
    try:
        user = g.user
        if float(user.cash_balance) < float(amount):
            return jsonify({"error": "Insufficient cash balance."}), 400
        user.cash_balance = float(user.cash_balance) - float(amount)
        db.session.commit()
        return jsonify({
            "message": "Withdrawal successful.",
            "cash_balance": float(user.cash_balance)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # For development purposes only. In production, use a WSGI server.
    app.run(host='0.0.0.0', port=5000, debug=True)
