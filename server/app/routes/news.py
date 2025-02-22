# app/routes/news.py
from flask import Blueprint, jsonify, request
import requests
import os
from finvizfinance.news import News

bp = Blueprint('news', __name__)

@bp.route('/calendar', methods=['GET'])
def get_economic_calendar():
    return jsonify({"message": "FinViz Stock Watchlist API is running!"})

@bp.route('/market-news', methods=['GET'])
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
        return jsonify({"relevant_news": news_data_converted}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/ticker-search', methods=['GET'])
def get_ticker():
    keyword = request.args.get('keywords', 'Microsoft')
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'YOUR_API_KEY')
    url = f'https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords={keyword}&apikey={api_key}'
    r = requests.get(url)
    if r.status_code != 200:
        return jsonify({"error": "Failed to fetch data from Alpha Vantage"}), 500
    data = r.json()
    return jsonify(data), 200

@bp.route('/news-sentiment', methods=['GET'])
def get_news_sentiment():
    tickers = request.args.get('tickers')
    if not tickers:
        return jsonify({"error": "The 'tickers' query parameter is required."}), 400
    topics = request.args.get('topics')
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'YOUR_API_KEY')
    url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={tickers}'
    if topics:
        url += f'&topics={topics}'
    url += f'&apikey={api_key}'
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as req_err:
        return jsonify({"error": f"Failed to fetch data from Alpha Vantage: {req_err}"}), 500
    data = response.json()
    return jsonify(data), 200

@bp.route('/income-statement', methods=['GET'])
def get_income_statement():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "The 'symbol' query parameter is required."}), 400
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'YOUR_API_KEY')
    url = f'https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol={symbol}&apikey={api_key}'
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as req_err:
        return jsonify({"error": f"Failed to fetch data from Alpha Vantage: {req_err}"}), 500
    data = response.json()
    return jsonify(data), 200

@bp.route('/balance-sheet', methods=['GET'])
def get_balance_sheet():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "The 'symbol' query parameter is required."}), 400
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'YOUR_API_KEY')
    url = f'https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol={symbol}&apikey={api_key}'
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as req_err:
        return jsonify({"error": f"Failed to fetch data from Alpha Vantage: {req_err}"}), 500
    data = response.json()
    return jsonify(data), 200

@bp.route('/cash-flow', methods=['GET'])
def get_cash_flow():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({"error": "The 'symbol' query parameter is required."}), 400
    api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'YOUR_API_KEY')
    url = f'https://www.alphavantage.co/query?function=CASH_FLOW&symbol={symbol}&apikey={api_key}'
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as req_err:
        return jsonify({"error": f"Failed to fetch data from Alpha Vantage: {req_err}"}), 500
    data = response.json()
    return jsonify(data), 200
