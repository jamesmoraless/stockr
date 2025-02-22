# app/config.py
import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    FIREBASE_CREDENTIALS = os.getenv('FIREBASE_CREDENTIALS', 'path/to/default.json')
    # Add any additional configuration settings here