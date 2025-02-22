# app/routes/stocks.py
from flask import Blueprint, jsonify, request
import requests
import os
import pandas as pd
from finvizfinance.quote import finvizfinance

bp = Blueprint('stocks', __name__)

def convert_data(data):
    """Convert a pandas DataFrame to a dictionary if needed."""
    if isinstance(data, pd.DataFrame):
        return data.to_dict(orient='records')
    return data

def fetch_stock_data(ticker):
    ticker = ticker.upper()
    stock = finvizfinance(ticker)
    stock_fundament = convert_data(stock.ticker_fundament())
    stock_description = convert_data(stock.ticker_description())
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
        "volume": fundamentals_data.get("Volume"),
        "market_cap": fundamentals_data.get("Market Cap"),
        "forward_pe": fundamentals_data.get("Forward P/E"),
        "eps_this_year": fundamentals_data.get("EPS this Y"),
        "eps_ttm": fundamentals_data.get("EPS (ttm)"),
        "peg_ratio": fundamentals_data.get("PEG"),
        "roe": fundamentals_data.get("ROE"),
        "roa": fundamentals_data.get("ROA"),
        "profit_margin": fundamentals_data.get("Profit Margin"),
        "sales": fundamentals_data.get("Sales"),
        "debt_eq": fundamentals_data.get("Debt/Eq"),
        "current_ratio": fundamentals_data.get("Current Ratio")
    }
    return {
        "ticker": ticker,
        "description": stock_description,
        "fundamentals": filtered_fundamentals
    }

@bp.route('/search/<string:query>', methods=['GET'])
def search_stocks(query):
    try:
        yahoo_api_url = f"https://query1.finance.yahoo.com/v6/finance/autocomplete?lang=en&query={query}"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(yahoo_api_url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        results = data.get("ResultSet", {}).get("Result", [])
        stocks = [{"symbol": stock.get("symbol"), "name": stock.get("name")} for stock in results[:5]]
        if not stocks:
            return jsonify({"error": "No matching stocks found"}), 404
        return jsonify({"stocks": stocks}), 200
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/<string:ticker>', methods=['GET'])
def get_stock_data(ticker):
    try:
        ticker = ticker.upper()
        stock = finvizfinance(ticker)
        stock_fundament = convert_data(stock.ticker_fundament())
        stock_description = convert_data(stock.ticker_description())
        outer_ratings = convert_data(stock.ticker_outer_ratings())
        news = convert_data(stock.ticker_news())
        inside_trader = convert_data(stock.ticker_inside_trader())
        combined_data = {
            "fundamentals": stock_fundament,
            "description": stock_description,
            "outer_ratings": outer_ratings,
            "news": news,
            "inside_trader": inside_trader
        }
        return jsonify(combined_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def fetch_market_price(ticker):
    try:
        ticker = ticker.upper()
        stock = finvizfinance(ticker)
        fundamentals_data = stock.ticker_fundament()
        if not fundamentals_data:
            return {"ticker": ticker, "market_price": "N/A", "error": "No data found"}
        market_price = fundamentals_data.get("Price", "N/A")
        return {"ticker": ticker, "market_price": market_price}
    except Exception as e:
        return {"ticker": ticker, "market_price": "N/A", "error": str(e)}

@bp.route('/current/<string:ticker>', methods=['GET'])
def get_stock_price(ticker):
    market_data = fetch_market_price(ticker)
    return jsonify(market_data), 200

@bp.route('/historical/<string:symbol>', methods=['GET'])
def get_stock_historical(symbol):
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'YOUR_API_KEY')
    symbol = symbol.upper()
    url = (f'https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED'
           f'&symbol={symbol}&outputsize=full&apikey={api_key}')
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if "Error Message" in data:
            return jsonify({"error": data["Error Message"]}), 400
        if "Weekly Adjusted Time Series" not in data:
            return jsonify({"error": "Invalid response from Alpha Vantage"}), 400
        time_series = data["Weekly Adjusted Time Series"]
        dates = sorted(time_series.keys())
        prices = [time_series[date]["5. adjusted close"] for date in dates]
        return jsonify({"dates": dates, "prices": prices}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/crypto/historical/<string:symbol>', methods=['GET'])
def get_crypto_historical(symbol):
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'YOUR_API_KEY')
    symbol = symbol.upper()
    url = (f'https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY'
           f'&symbol={symbol}&market=USD&apikey={api_key}')
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if "Error Message" in data:
            return jsonify({"error": data["Error Message"]}), 400
        if "Time Series (Digital Currency Daily)" not in data:
            return jsonify({"error": "Invalid response from Alpha Vantage"}), 400
        time_series = data["Time Series (Digital Currency Daily)"]
        dates = sorted(time_series.keys())
        prices = [time_series[date]["4a. close (USD)"] for date in dates]
        return jsonify({"dates": dates, "prices": prices}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
