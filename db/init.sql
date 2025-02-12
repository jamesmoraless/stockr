CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio table (Each user has ONE portfolio)
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Holdings (stores assets in a portfolio)
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    shares NUMERIC(12,2) NOT NULL CHECK (shares >= 0),
    average_cost NUMERIC(12,2) CHECK (average_cost >= 0),
    book_value NUMERIC(12,2) CHECK (book_value >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, ticker) -- Prevent duplicate tickers in one portfolio
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    shares NUMERIC(12,2) NOT NULL CHECK (shares > 0),
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolio_holdings_ticker ON portfolio_holdings(ticker);
CREATE INDEX idx_transactions_ticker ON transactions(ticker);

DROP TABLE IF EXISTS transactions, portfolio_holdings, portfolios, watchlist, users CASCADE;
