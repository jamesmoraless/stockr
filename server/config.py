# config.py
import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    FIREBASE_CREDENTIALS = os.getenv('FIREBASE_CREDENTIALS', 'path/to/default.json')
    ALPHAVANTAGE_API_KEY = os.environ['STOCKR_ALPHA_ID']
