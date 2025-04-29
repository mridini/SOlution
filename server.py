from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests 

app = Flask(__name__)
CORS(app)  # Allow React frontend to talk to Flask

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    return jsonify({'message': 'File uploaded successfully!', 'filename': file.filename})

PDF_EXTRACTION_API = 'https://plankton-app-qajlk.ondigitalocean.app/extraction_api'

@app.route('/extract', methods=['POST'])
def extract_data():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        print('❌ No filename received')
        return jsonify({'error': 'Filename not provided'}), 400

    file_path = os.path.join(UPLOAD_FOLDER, filename)
    print(f'📄 Trying to open file at: {file_path}')

    if not os.path.exists(file_path):
        print('❌ File not found on server')
        return jsonify({'error': 'File not found'}), 404

    try:
        with open(file_path, 'rb') as f:
            files = {'file': (filename, f, 'application/pdf')}
            print(f'📤 Sending file to Extraction API: {PDF_EXTRACTION_API}')
            response = requests.post(PDF_EXTRACTION_API, files=files)
            print(f'🔵 API Response Status: {response.status_code}')
            print(f'🔵 API Response Text: {response.text}')
            response.raise_for_status()
            extracted_data = response.json()
            return jsonify(extracted_data)
    except Exception as e:
        print(f'❗ Exception: {str(e)}')
        return jsonify({'error': str(e)}), 500
    
MATCHING_API_BATCH = 'https://endeavor-interview-api-gzwki.ondigitalocean.app/match/batch'

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


if __name__ == '__main__':
    app.run(port=5000, debug=True)
