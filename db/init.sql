CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (already exists from auth setup)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT UNIQUE NOT NULL,
    cash_balance NUMERIC(12,2) NOT NULL DEFAULT 10000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Porfolio table 
CREATE TABLE IF NOT EXISTS portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    shares NUMERIC(12,2) NOT NULL,
    average_cost NUMERIC(12,2),
    market_value NUMERIC(12,2),
    book_value NUMERIC(12,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    ticker VARCHAR(10) NOT NULL,
    shares NUMERIC(12,2) NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    transaction_type TEXT NOT NULL, -- 'buy' or 'sell'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
