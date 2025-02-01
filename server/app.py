from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allows frontend to access API

@app.route('/')
def home():
    return jsonify({"message": "FinViz Stock Watchlist API is running!"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)