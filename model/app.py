from flask import Flask, request, render_template
import os
import pandas as pd
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Define upload folder
UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit file size to 16MB

# Allowed file types
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def upload_form():
    return render_template('upload.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return "No file part"
    file = request.files['file']
    if file.filename == '':
        return "No selected file"
    
    name = request.form['name']  # User input for certificate holder name
    certificate_type = request.form['certificate_type']  # Study, Experience, Extra Curricular
    category = request.form['category']  # Specific category (Internship, Sports, Global, etc.)
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        if os.path.exists("certificates.csv"):
            existing_df = pd.read_csv("certificates.csv")
        else:
            existing_df = pd.DataFrame(columns=['Name', 'Filename', 'Certificate Type', 'Category'])

        new_entry = pd.DataFrame([[name, filename, certificate_type, category]],
                                columns=['Name', 'Filename', 'Certificate Type', 'Category'])
        existing_df = pd.concat([existing_df, new_entry], ignore_index=True)
        existing_df.to_csv("certificates.csv", index=False)

        update_leaderboard()
        return "File uploaded successfully!"
    else:
        return "Invalid file format"

@app.route('/leaderboard')
def leaderboard():
    leaderboard_df = pd.read_csv("leaderboard.csv")
    return render_template("leaderboard.html", leaderboard=leaderboard_df.to_dict(orient='records'))

@app.route('/recommendations')
def recommendations():
    recommendations_df = pd.read_csv("gray_areas_analysis.csv")
    return render_template("recommendations.html", recommendations=recommendations_df.to_dict(orient='records'))

def update_leaderboard():
    csv_filename = "certificates.csv"
    if not os.path.exists(csv_filename):
        return
    
    df = pd.read_csv(csv_filename)
    # file_path = "Areas.xlsx"
    # if not os.path.exists(file_path):
    #     return
    
    # xls = pd.ExcelFile(file_path)
    # score_data = pd.read_excel(xls, sheet_name="Sheet1")
    score_mapping = {
        "Technical": {"Foundational": 5, "Intermediate": 7, "Global": 10},
        "Experienced": {"Internship": 6, "Company": 7, "Startup": 9, "Entrepreneurship": 10},
        "Extra-Curricular": {"Sports": 6, "Creative Arts": 6, "Hackathon": 8, "Seminar": 10}
    }
    scores = []
    for _, row in df.iterrows():
        certificate_type = row["Certificate Type"]
        category = row["Category"]
        total_score = 0
        if certificate_type in score_mapping:
            for cat in category.split(", "):
                total_score += score_mapping[certificate_type].get(cat.strip(), 0)
        scores.append(total_score)

    df["Score"] = scores
    leaderboard = df.groupby("Name")["Score"].sum().reset_index()
    leaderboard = leaderboard.sort_values(by="Score", ascending=False)
    leaderboard["Rank"] = leaderboard["Score"].rank(method="dense", ascending=False).astype(int)
    leaderboard.to_csv("leaderboard.csv", index=False)

if __name__ == "__main__":
    app.run(debug=True)