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


db = SQLAlchemy(app)
firebase_cred_path = os.getenv('FIREBASE_CREDENTIALS', 'path/to/default.json')
# Firebase setup: Replace the details with your actual Firebase service account information.
cred = credentials.Certificate(firebase_cred_path)
firebase_admin.initialize_app(cred)



# Models
# users is good
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())
    # Additional fields can be added as needed

# watchlist is broken
class Watchlist(db.Model):
    __tablename__ = 'watchlist'
    id = db.Column(
        db.String(36),
        primary_key=True,
        server_default=db.text("uuid_generate_v4()")
    )
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())


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
    if request.endpoint in ['add_to_watchlist', 'get_watchlist_stocks', 'delete_from_watchlist']:
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
        response_data = fetch_stock_data(ticker)
        return jsonify(response_data), 200
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
            firebase_uid=data['firebase_uid']
        )
        db.session.add(new_user)
        db.session.commit()
        print("User created successfully:", new_user.id)
        return jsonify({"message": "User created", "id": new_user.id}), 201

    except Exception as e:
        print("Error creating user:", str(e))
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # For development purposes only. In production, use a WSGI server.
    app.run(host='0.0.0.0', port=5000, debug=True)
