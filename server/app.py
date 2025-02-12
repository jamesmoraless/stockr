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
from models import db, User, Watchlist, Portfolio, Transaction, PortfolioHolding


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
    if request.endpoint in ['add_to_watchlist', 'get_watchlist_stocks', 'delete_from_watchlist', 
                            'get_stock_historical', 'get_crypto_historical', 'get_cash_balance', 
                            'add_portfolio_entry', 'get_portfolio_for_graph','get_portfolio', 'deposit_cash', 
                            'withdraw_cash', 'delete_transaction', 'get_transactions', 'buy_asset', 'sell_asset', 'get_portfolio_id',
                            'sell_portfolio_asset', 'add_portfolio_asset']:
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

@app.route('/api/portfolio/<string:portfolio_id>', methods=['GET'])
def get_portfolio(portfolio_id):
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401

        # Ensure the user owns the portfolio
        portfolio = Portfolio.query.filter_by(id=portfolio_id, user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found or unauthorized"}), 404

        # Fetch holdings from portfolio_holdings table
        portfolio_entries = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
        portfolio_list = [{
            "ticker": entry.ticker,
            "shares": float(entry.shares),
            "average_cost": float(entry.average_cost) if entry.average_cost is not None else 0,
            "book_value": float(entry.book_value) if entry.book_value is not None else 0,
            "market_value": 0  # Placeholder, update if market value is available
        } for entry in portfolio_entries]

        return jsonify({"portfolio": portfolio_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/portfolio/buy', methods=['POST'])
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

        # Create buy transaction
        new_txn = Transaction(
            portfolio_id=portfolio.id,
            ticker=ticker,
            shares=shares,
            price=price,
            transaction_type="buy"
        )
        db.session.add(new_txn)
        db.session.commit()

        # Recalculate portfolio after buy
        recalc_portfolio(portfolio.id, ticker)

        return jsonify({"message": "Asset purchased successfully.", "ticker": ticker}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/portfolio/sell', methods=['POST'])
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
        
        # Ensure user has enough shares to sell
        if not holding or holding.shares < shares:
            return jsonify({"error": "Not enough shares to sell."}), 400

        # Create sell transaction
        new_txn = Transaction(
            portfolio_id=portfolio.id,
            ticker=ticker,
            shares=shares,
            price=price,
            transaction_type="sell"
        )
        db.session.add(new_txn)
        db.session.commit()

        # Recalculate portfolio after selling
        recalc_portfolio(portfolio.id, ticker)

        return jsonify({"message": "Asset sold successfully.", "ticker": ticker}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/portfolio/<string:portfolio_id>/add-asset', methods=['POST'])
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

        # Ensure portfolio exists
        portfolio = Portfolio.query.filter_by(id=portfolio_id, user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found or unauthorized"}), 404

        # Add transaction record
        new_txn = Transaction(
            portfolio_id=portfolio.id,
            ticker=ticker,
            shares=shares,
            price=price,
            transaction_type=transaction_type
        )
        db.session.add(new_txn)

        # Update portfolio holdings
        recalc_portfolio(portfolio.id, ticker)

        db.session.commit()
        return jsonify({"message": "Transaction recorded and portfolio updated successfully."}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/portfolio/<string:portfolio_id>/sell-asset', methods=['POST'])
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
        transaction_type = 'sell'

        if not ticker or shares is None or price is None:
            return jsonify({"error": "Ticker, shares, and price are required."}), 400

        ticker = ticker.upper()

        # Ensure portfolio exists
        portfolio = Portfolio.query.filter_by(id=portfolio_id, user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found or unauthorized"}), 404

        # Ensure the user has enough shares to sell
        portfolio_entry = PortfolioHolding.query.filter_by(portfolio_id=portfolio.id, ticker=ticker).first()
        if not portfolio_entry or portfolio_entry.shares < shares:
            return jsonify({"error": "Insufficient shares to sell"}), 400

        # Add transaction record
        new_txn = Transaction(
            portfolio_id=portfolio.id,
            ticker=ticker,
            shares=shares,
            price=price,
            transaction_type=transaction_type
        )
        db.session.add(new_txn)

        # Update portfolio holdings
        recalc_portfolio(portfolio.id, ticker)

        db.session.commit()
        return jsonify({"message": "Transaction recorded and portfolio updated successfully."}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/api/portfolio/graph/<string:portfolio_id>', methods=['GET'])
def get_portfolio_for_graph(portfolio_id):
    try:
        # Ensure user is authenticated
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401

        # Ensure the user owns this portfolio
        portfolio = Portfolio.query.filter_by(id=portfolio_id, user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found or unauthorized"}), 404

        # Retrieve holdings for this portfolio
        portfolio_entries = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id).all()
        portfolio_list = [{
            "ticker": entry.ticker,
            "book_value": float(entry.book_value) if entry.book_value is not None else 0
        } for entry in portfolio_entries]

        return jsonify({"portfolio": portfolio_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def recalc_portfolio(portfolio_id, ticker):
    transactions = Transaction.query.filter_by(portfolio_id=portfolio_id, ticker=ticker).all()

    total_shares = 0
    total_cost = 0.0

    for txn in transactions:
        txn_shares = float(txn.shares)
        txn_price = float(txn.price)

        if txn.transaction_type.lower() == 'buy':
            total_shares += txn_shares
            total_cost += txn_shares * txn_price  # Add to cost basis

        elif txn.transaction_type.lower() == 'sell' and total_shares >= txn_shares:
            avg_cost_per_share = total_cost / total_shares if total_shares > 0 else 0
            total_shares -= txn_shares
            total_cost -= txn_shares * avg_cost_per_share  # Reduce cost by the avg cost per share

    # Ensure book value is non-negative
    new_book_value = max(0, total_cost)
    
    # Calculate new average cost
    new_avg_cost = (new_book_value / total_shares) if total_shares > 0 else 0

    portfolio_entry = PortfolioHolding.query.filter_by(portfolio_id=portfolio_id, ticker=ticker).first()

    if portfolio_entry:
        if total_shares > 0:
            portfolio_entry.shares = total_shares
            portfolio_entry.average_cost = new_avg_cost
            portfolio_entry.book_value = new_book_value
        else:
            db.session.delete(portfolio_entry)  # Remove asset if sold out
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
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """Retrieve all transactions for the authenticated user's portfolio."""
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401

        # Get user's portfolio
        portfolio = Portfolio.query.filter_by(user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found"}), 404

        transactions = Transaction.query.filter_by(portfolio_id=portfolio.id).order_by(Transaction.created_at.desc()).limit(15).all()##limit of 15 recetn transactions
        
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
    """Delete a transaction and update the portfolio accordingly."""
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401

        # Find user's portfolio
        portfolio = Portfolio.query.filter_by(user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found"}), 404

        # Fetch the transaction within the user's portfolio
        transaction = Transaction.query.filter_by(id=transaction_id, portfolio_id=portfolio.id).first()
        if not transaction:
            return jsonify({"error": "Transaction not found"}), 404

        ticker = transaction.ticker
        shares = float(transaction.shares)
        price = float(transaction.price)
        total_value = shares * price

        # Modify portfolio holdings based on transaction type
        holding = PortfolioHolding.query.filter_by(portfolio_id=portfolio.id, ticker=ticker).first()

        if transaction.transaction_type.lower() == 'buy':
            # If it's a buy transaction, we remove the shares and adjust book value
            if holding:
                holding.shares -= shares
                holding.book_value -= total_value
                if holding.shares <= 0:
                    db.session.delete(holding)  # Remove holding if zero shares remain

        elif transaction.transaction_type.lower() == 'sell':
            # If it's a sell transaction, we restore shares into portfolio
            if holding:
                holding.shares += shares
                holding.book_value += total_value
            else:
                # If the holding didn't exist before, recreate it
                new_holding = PortfolioHolding(
                    id=str(uuid.uuid4()),
                    portfolio_id=portfolio.id,
                    ticker=ticker,
                    shares=shares,
                    average_cost=price,
                    book_value=total_value
                )
                db.session.add(new_holding)

        # Delete transaction record
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
            portfolio = Portfolio.query.filter_by(user_id=existing_user.id).first()
            return jsonify({
                "message": "User already exists",
                "user_id": existing_user.id,
                "portfolio_id": portfolio.id if portfolio else None
            }), 200

        # Create new user
        new_user = User(
            id=str(uuid.uuid4()),
            firebase_uid=data['firebase_uid']
        )
        db.session.add(new_user)
        db.session.commit()

        # Assign a portfolio to the user
        new_portfolio = Portfolio(
            id=str(uuid.uuid4()),
            user_id=new_user.id
        )
        db.session.add(new_portfolio)
        db.session.commit()

        print("User and portfolio created successfully:", new_user.id, new_portfolio.id)

        return jsonify({
            "message": "User created",
            "user_id": new_user.id,
            "portfolio_id": new_portfolio.id
        }), 201

    except Exception as e:
        print("Error creating user:", str(e))
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/portfolio/id', methods=['GET'])
def get_portfolio_id():
    try:
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401

        # Find portfolio for authenticated user
        portfolio = Portfolio.query.filter_by(user_id=g.user.id).first()
        if not portfolio:
            return jsonify({"error": "Portfolio not found"}), 404

        return jsonify({"portfolio_id": portfolio.id}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # For development purposes only. In production, use a WSGI server.
    app.run(host='0.0.0.0', port=5000, debug=True)
