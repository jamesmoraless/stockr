# app/routes/__init__.py
# This file can remain empty or be used to import blueprints.
from .auth import bp as auth_bp
from .stocks import bp as stocks_bp
from .portfolio import bp as portfolio_bp
from .transactions import bp as transactions_bp
from .watchlist import bp as watchlist_bp
from .news import bp as news_bp