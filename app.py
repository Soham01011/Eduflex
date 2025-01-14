from flask import Flask, render_template, request, redirect, url_for
import os
from werkzeug.utils import secure_filename
import secrets
from classify_model import classify_certificate

# Initialize Flask app
app = Flask(__name__)

# Generate a secure key
app.config['SECRET_KEY'] = secrets.token_hex(16)

# Configuration for file uploads
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Helper function to check allowed file types
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Leaderboard data structure
leaderboard = {}

# Home route
@app.route('/')
def index():
    return render_template('upload.html', leaderboard=leaderboard)

# Route to handle file uploads
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files or 'username' not in request.form:
        return render_template('upload.html', error="Please provide a username and file")

    username = request.form['username']
    file = request.files['file']

    if file.filename == '':
        return render_template('upload.html', error="No file selected for uploading")

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        try:
            # Save the uploaded file
            file.save(filepath)

            # Classify the certificate and assign points
            cert_type, points = classify_certificate(filepath)

            # Update leaderboard
            if username in leaderboard:
                leaderboard[username] += points
            else:
                leaderboard[username] = points

            # Sort leaderboard by points
            sorted_leaderboard = dict(sorted(leaderboard.items(), key=lambda x: x[1], reverse=True))

            return render_template('success.html', 
                                   filename=filename, 
                                   cert_type=cert_type, 
                                   points=points, 
                                   leaderboard=sorted_leaderboard)

        except Exception as e:
            print(f"Error saving or processing file: {e}")
            return render_template('upload.html', error="Error processing the file. Please try again.")

    return render_template('upload.html', error="Invalid file type. Only PDF allowed")

if __name__ == '__main__':
    app.run(debug=True)
