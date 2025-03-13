# helpers.py
import pandas as pd
import json

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
