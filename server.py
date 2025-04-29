from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import pandas as pd
from difflib import get_close_matches, SequenceMatcher

# --- Flask app setup ---
app = Flask(__name__)
CORS(app)

# --- File upload setup ---
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- Database setup ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sales_orders.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Database model ---
class SalesOrder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    data = db.Column(db.Text, nullable=False)  # Store JSON as text

# --- External APIs ---
PDF_EXTRACTION_API = 'https://plankton-app-qajlk.ondigitalocean.app/extraction_api'
MATCHING_API_BATCH = 'https://endeavor-interview-api-gzwki.ondigitalocean.app/match/batch'

# --- Load Local Product Catalog ---
catalog_df = pd.read_csv('unique_fastener_catalog.csv')
catalog_df.columns = catalog_df.columns.str.strip()  # <--- clean up column names
product_names = catalog_df['Description'].tolist()


def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()

# --- Routes ---

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)

    return jsonify({'message': 'File uploaded successfully!', 'filename': file.filename})

@app.route('/extract', methods=['POST'])
def extract_data():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'Filename not provided'}), 400

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    try:
        with open(file_path, 'rb') as f:
            files = {'file': (filename, f, 'application/pdf')}
            response = requests.post(PDF_EXTRACTION_API, files=files)
            response.raise_for_status()
            extracted_data = response.json()
            return jsonify(extracted_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/match_items', methods=['POST'])
def match_items():
    data = request.get_json()
    items = data.get('items', [])

    if not items:
        return jsonify({'error': 'No items provided'}), 400

    try:
        response = requests.post(MATCHING_API_BATCH, json={"queries": items})
        response.raise_for_status()
        results = response.json()
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/local_match', methods=['POST'])
def local_match():
    data = request.get_json()
    items = data.get('items', [])

    if not items:
        return jsonify({'error': 'No items provided'}), 400

    results = {}

    try:
        for item in items:
            matches = get_close_matches(item, product_names, n=5, cutoff=0.5)
            result = [{'match': m, 'score': similarity(item, m)} for m in matches]
            results[item] = sorted(result, key=lambda x: x['score'], reverse=True)

        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/save_order', methods=['POST'])
def save_order():
    data = request.get_json()
    filename = data.get('filename')
    items = data.get('items')

    if not filename or not items:
        return jsonify({'error': 'Missing filename or items'}), 400

    try:
        order = SalesOrder(
            filename=filename,
            data=json.dumps(items)
        )
        db.session.add(order)
        db.session.commit()
        return jsonify({'message': 'Sales order saved successfully!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_orders', methods=['GET'])
def get_orders():
    try:
        orders = SalesOrder.query.order_by(SalesOrder.upload_date.desc()).all()
        orders_list = [{
            'id': order.id,
            'filename': order.filename,
            'upload_date': order.upload_date.isoformat()
        } for order in orders]

        return jsonify({'orders': orders_list})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_order/<int:order_id>', methods=['GET'])
def get_order(order_id):
    try:
        order = SalesOrder.query.get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404

        order_data = {
            'id': order.id,
            'filename': order.filename,
            'upload_date': order.upload_date.isoformat(),
            'data': json.loads(order.data)
        }
        return jsonify(order_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
