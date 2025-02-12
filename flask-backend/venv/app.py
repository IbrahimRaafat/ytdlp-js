import os
from flask import Flask, request, jsonify, send_from_directory
from download import handle_download, get_job_status
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/download": {"origins": "http://localhost:5173"}, r"/status/*": {"origins": "http://localhost:5173"}, r"/download/*": {"origins": "http://localhost:5173"}})  # Enable CORS for specific routes

# Define the "downloads" folder path relative to where this file is located
DOWNLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), 'downloads'))

# Ensure the "downloads" folder exists
if not os.path.exists(DOWNLOAD_FOLDER):
    os.makedirs(DOWNLOAD_FOLDER)

# Register download and status routes
@app.route('/download', methods=['POST'])
def download():
    return handle_download()

@app.route('/status/<job_id>', methods=['GET'])
def status(job_id):
    return get_job_status(job_id)

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(DOWNLOAD_FOLDER, filename)

if __name__ == '__main__':
    app.run(port=3001, debug=True)