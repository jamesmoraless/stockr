# helpers.py
import pandas as pd
import json
import csv
from datetime import datetime
import re

def convert_data(data):
    """Convert a pandas DataFrame to a dictionary if needed."""
    if isinstance(data, pd.DataFrame):
        return data.to_dict(orient='records')
    return data

def safe_convert(value):
    """Try to JSON-serialize a value; if it fails, return its string representation."""
    try:
        json.dumps(value)
        return value
    except (TypeError, OverflowError):
        return str(value)


def parse_csv_with_mapping(stream):
    """Parse CSV data using flexible header mapping"""
    header_mapping = {
        "ticker": ["ticker", "symbol", "security", "stock"],
        "shares": ["shares", "quantity", "units", "amount"],
        "price": ["price", "cost", "unit price", "price per share"],
        "transaction_type": ["transaction type", "type", "action", "activity"],
        "date": ["date", "trade date", "transaction date"]
    }

    stream.seek(0)

    # Read the first line to get headers
    header_line = stream.readline().strip()
    stream.seek(0)
    csv_reader = csv.DictReader(stream)

    # Create a mapping from actual CSV headers to our standardized field names
    field_map = {}
    for target_field, possible_names in header_mapping.items():
        for header in csv_reader.fieldnames:
            if any(possible_name.lower() == header.lower() for possible_name in possible_names):
                field_map[header] = target_field
                break

    # Special case handling for brokerages with unique formats
    if "CurrencyCode_Group_Account" in header_line and "Symbol" in field_map:
        # Questrade format detected
        field_map["Action"] = "transaction_type"
        field_map["Trade Date"] = "date"

    elif "Activity Type" in header_line and any("Symbol" in h for h in csv_reader.fieldnames):
        # Wealthsimple format detected
        # May need special handling for symbol extraction
        pass

    # Process rows with the field mapping
    transactions = []
    for row in csv_reader:
        transaction_data = {}

        # Map fields using our field_map
        for csv_field, target_field in field_map.items():
            if csv_field in row:
                transaction_data[target_field] = row[csv_field]

        # Special case: Extract ticker from "Symbol / Description" type fields
        if "ticker" not in transaction_data:
            for field in row.keys():
                if any(keyword in field.lower() for keyword in ["symbol", "description", "security"]):
                    # Try to extract ticker pattern (usually 1-5 uppercase letters)
                    symbol_desc = row[field]
                    ticker_match = re.search(r'\b[A-Z]{1,5}\b', symbol_desc)
                    if ticker_match:
                        transaction_data["ticker"] = ticker_match.group(0)
                        break

        # Process transaction type
        if "transaction_type" in transaction_data:
            tx_type = transaction_data["transaction_type"].lower()
            transaction_data["transaction_type"] = "buy" if any(
                word in tx_type for word in ["buy", "purchase"]) else "sell"
        else:
            # Default to buy if not specified
            transaction_data["transaction_type"] = "buy"

        # Process date
        if "date" in transaction_data:
            date_str = transaction_data["date"]
            # Try different date formats
            date_formats = ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%d-%m-%Y", "%m-%d-%Y", "%d-%m-%y"]
            for fmt in date_formats:
                try:
                    transaction_data["date"] = datetime.strptime(date_str, fmt).date()
                    break
                except ValueError:
                    continue

        # Process shares and price (ensure they're positive numbers)
        if "shares" in transaction_data:
            try:
                transaction_data["shares"] = abs(float(transaction_data["shares"]))
            except (ValueError, TypeError):
                transaction_data["shares"] = 0

        if "price" in transaction_data:
            try:
                transaction_data["price"] = abs(float(transaction_data["price"]))
            except (ValueError, TypeError):
                transaction_data["price"] = 0

        # Validate and add the transaction
        if (transaction_data.get("ticker") and
                transaction_data.get("shares", 0) > 0 and
                transaction_data.get("price", 0) > 0):
            transactions.append(transaction_data)

    return transactions