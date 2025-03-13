# routes.py
import uuid
from re import findall
import os
import time
import json
import requests
import pandas as pd
import csv

from flask import jsonify, request, g
from firebase_admin import auth
from finvizfinance.quote import finvizfinance
from finvizfinance.news import News
from finvizfinance.screener.ticker import Ticker
from finvizfinance.calendar import Calendar
from io import StringIO

from models import db, User, Watchlist, Portfolio, Transaction, PortfolioHolding
from helpers import convert_data, safe_convert

def register_routes(app):

    # Before each request, check Firebase token for protected endpoints.
    @app.before_request
    def authenticate():
        if request.method == "OPTIONS":
            return  # Skip auth for preflight
        protected_endpoints = [
            'add_to_watchlist', 'get_watchlist_stocks', 'delete_from_watchlist',
            'get_stock_historical', 'get_crypto_historical', 'get_cash_balance',
            'add_portfolio_entry', 'get_portfolio_for_graph', 'get_portfolio', 'deposit_cash',
            'withdraw_cash', 'delete_transaction', 'get_transactions', 'buy_asset', 'sell_asset',
            'get_portfolio_id', 'sell_portfolio_asset', 'add_portfolio_asset', 'get_stock_market_price',
            'search_stocks', 'upload_transactions'
        ]
        if request.endpoint in protected_endpoints:
            auth_header = request.headers.get('Authorization')
            if not auth_header or 'Bearer ' not in auth_header:
                return jsonify({"error": "Unauthorized"}), 401
            id_token = auth_header.split('Bearer ')[1]
            try:
                decoded_token = auth.verify_id_token(id_token)
                g.user = User.query.filter_by(firebase_uid=decoded_token['uid']).first()
                if not g.user:
                    return jsonify({"error": "User not found"}), 401
            except Exception as e:
                return jsonify({"error": str(e)}), 401

    # --- Helper functions used by routes ---

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
            print(f"Error fetching market price for {ticker}: {e}")
            return {"ticker": ticker, "market_price": "N/A", "error": str(e)}

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

    # --- Route Definitions ---

    @app.route("/")
    def home():
        return jsonify({"message": "FinViz Stock Watchlist API is running!"})

    @app.route("/api/calendar", methods=["GET"])
    def get_economic_calendar():
        return jsonify({"message": "FinViz Stock Watchlist API is running!"})

    @app.route("/api/stocks/<string:query>", methods=["GET"])
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

    @app.route("/api/stock/<string:ticker>", methods=["GET"])
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

    @app.route("/api/stock/current/<string:ticker>", methods=["GET"])
    def get_stock_price(ticker):
        market_data = fetch_market_price(ticker)
        return jsonify(market_data), 200

    @app.route("/api/watchlist/stocks", methods=["GET"])
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
                    stocks_data.append({"ticker": ticker, "error": str(inner_error)})
            return jsonify(stocks_data), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/watchlist", methods=["POST"])
    def add_to_watchlist():
        data = request.get_json()
        if not data or 'ticker' not in data:
            return jsonify({"error": "Ticker is required"}), 400
        ticker = data['ticker'].upper()
        try:
            new_watchlist_item = Watchlist(user_id=g.user.id, ticker=ticker)
            db.session.add(new_watchlist_item)
            db.session.commit()
            return jsonify({"message": "Ticker added to watchlist", "ticker": ticker, "user_id": g.user.id}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/watchlist/<string:ticker>", methods=["DELETE"])
    def delete_from_watchlist(ticker):
        ticker = ticker.upper()
        item = Watchlist.query.filter_by(user_id=g.user.id, ticker=ticker).first()
        if not item:
            return jsonify({"error": "Ticker not found in watchlist"}), 404
        try:
            db.session.delete(item)
            db.session.commit()
            return jsonify({"message": "Ticker removed from watchlist", "ticker": ticker, "user_id": g.user.id}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/stock/historical/<string:symbol>", methods=["GET"])
    def get_stock_historical(symbol):
        api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'IH7UCOABIKN6Y6KH')
        symbol = symbol.upper()
        url = f'https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol={symbol}&outputsize=full&apikey={api_key}'
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
            graph_data = {"dates": dates, "prices": prices}
            return jsonify(graph_data), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/crypto/historical/<string:symbol>", methods=["GET"])
    def get_crypto_historical(symbol):
        api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'IH7UCOABIKN6Y6KH')
        symbol = symbol.upper()
        url = f'https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol={symbol}&market=USD&apikey={api_key}'
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
            graph_data = {"dates": dates, "prices": prices}
            return jsonify(graph_data), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/market-news", methods=["GET"])
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

    @app.route("/api/ticker-search", methods=["GET"])
    def get_ticker():
        keyword = request.args.get('keywords', 'Microsoft')
        api_key = os.getenv('ALPHAVANTAGE_API_KEY', 'IH7UCOABIKN6Y6KH')
        url = f'https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords={keyword}&apikey={api_key}'
        r = requests.get(url)
        if r.status_code != 200:
            return jsonify({"error": "Failed to fetch data from Alpha Vantage"}), 500
        data = r.json()
        return jsonify(data), 200

    @app.route("/api/news-sentiment", methods=["GET"])
    def get_news_sentiment():
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

    @app.route("/api/income-statement", methods=["GET"])
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

    @app.route("/api/balance-sheet", methods=["GET"])
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

    @app.route("/api/cash-flow", methods=["GET"])
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

    @app.route("/api/portfolio/<string:portfolio_id>", methods=["GET"])
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
                "market_value": 0
            } for entry in portfolio_entries]
            return jsonify({"portfolio": portfolio_list}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/portfolio/buy", methods=["POST"])
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

    @app.route("/api/portfolio/sell", methods=["POST"])
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

    @app.route("/api/portfolio/<string:portfolio_id>/add-asset", methods=["POST"])
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

    @app.route("/api/portfolio/<string:portfolio_id>/sell-asset", methods=["POST"])
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
                transaction_type=transaction_type
            )
            db.session.add(new_txn)
            recalc_portfolio(portfolio.id, ticker)
            db.session.commit()
            return jsonify({"message": "Transaction recorded and portfolio updated successfully."}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/portfolio/graph/<string:portfolio_id>", methods=["GET"])
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

    @app.route("/api/transactions", methods=["GET"])
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

    @app.route("/api/transactions/<string:transaction_id>", methods=["DELETE"])
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
                        id=str(uuid.uuid4()),
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

    @app.route("/api/users", methods=["POST"])
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
            new_user = User(id=str(uuid.uuid4()), firebase_uid=data['firebase_uid'])
            db.session.add(new_user)
            db.session.commit()
            new_portfolio = Portfolio(id=str(uuid.uuid4()), user_id=new_user.id)
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

    @app.route("/api/portfolio/id", methods=["GET"])
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

    @app.route("/api/portfolio/<string:portfolio_id>/upload-transactions", methods=["POST"])
    def upload_transactions(portfolio_id):
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({"error": "User not authenticated"}), 401

        if "file" not in request.files:
            return jsonify({"error": "No file part in the request"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        try:
            stream = StringIO(file.read().decode("UTF8"), newline=None)
            csv_reader = csv.DictReader(stream)

            # Get the portfolio for the authenticated user using the provided portfolio_id.
            portfolio = Portfolio.query.filter_by(id=portfolio_id, user_id=g.user.id).first()
            if not portfolio:
                return jsonify({"error": "Portfolio not found or unauthorized"}), 404

            transactions_added = 0
            errors = []
            # Track tickers to update portfolio holdings later.
            tickers_set = set()

            for row in csv_reader:
                # Expect CSV columns: ticker, shares, price, transaction_type.
                ticker = row.get("ticker", "").strip().upper()
                try:
                    shares = float(row.get("shares", 0))
                    price = float(row.get("price", 0))
                except ValueError:
                    errors.append(f"Invalid numeric values in row: {row}")
                    continue

                transaction_type = row.get("transaction_type", "buy").strip().lower()

                if not ticker or shares <= 0 or price <= 0:
                    errors.append(f"Invalid data in row: {row}")
                    continue

                tickers_set.add(ticker)
                new_txn = Transaction(
                    portfolio_id=portfolio.id,
                    ticker=ticker,
                    shares=shares,
                    price=price,
                    transaction_type=transaction_type
                )
                db.session.add(new_txn)
                transactions_added += 1

            db.session.commit()

            # Recalculate portfolio holdings for each unique ticker.
            for ticker in tickers_set:
                recalc_portfolio(portfolio.id, ticker)

            if errors:
                return (
                    jsonify({
                        "message": f"{transactions_added} transactions added with some errors.",
                        "errors": errors,
                    }),
                    207,
                )

            return jsonify({"message": f"{transactions_added} transactions added successfully."}), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500