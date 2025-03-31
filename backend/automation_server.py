import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import os ,re ,nltk
import pandas as pd
from werkzeug.utils import secure_filename
import pdfplumber
from pdfminer.high_level import extract_pages ,extract_text
from pdfminer.layout import LAParams, LTTextBox, LTTextLine, LTChar
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.converter import PDFPageAggregator
from pdfminer.pdfpage import PDFPage
import pytesseract
from PIL import Image
from nltk.corpus import stopwords

from model2 import extract_font_information_with_metadata_and_images, prepare_data_for_prediction, preprocessor, model

nltk.download('stopwords')
stop_words = set(stopwords.words('english'))

app = Flask(__name__)
CORS(app)  
UPLOAD_FOLDER = 'apiuploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

HASHTAG_FOLDER = 'hashtag_extraction'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

CERT_DETECTION = 'uploads'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['HASHTAG_FOLDER'] = HASHTAG_FOLDER
app.config['CERT_DETECTION'] = CERT_DETECTION


#--------------------------------------------------------------------------    UPLOAD
def extract_ids_from_pdf(file_path):
    ids = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                for row in table:
                    for cell in row:
                        if cell and cell.isdigit():
                            ids.append(int(cell))
    return ids

def extract_names_from_pdf(file_path):
    names = []
    
    def is_integer(value):
        try:
            word = int(value)
            return True
        except ValueError:
            if(len(value) < 4 ):
                return True
            return False

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                for row in table:
                    for cell in row:
                        if cell and not is_integer(cell):
                            names.append(cell)
    
    return names

def extract_ids_from_excel(file_path):
    ids = []
    df = pd.read_excel(file_path)
    for column in df.columns:
        ids.extend(df[column].dropna().astype(str).str.extract('(\d+)')[0].dropna().astype(int).tolist())
    return ids

def extract_names_from_excel(file_path):
    names = []
    
    def is_integer(value):
        try:
            word = int(value)
            word = float(value)
            return True
        except ValueError:
            if len(value) < 4:
                return True
            return False
    
    df = pd.read_excel(file_path)
    for column in df.columns:
        for value in df[column].dropna().astype(str).tolist():
            if not is_integer(value):
                names.append(value)
    
    return names


def extract_lines_from_pdf(pdf_file):
    extracted_lines = []
    try:
        # Process each page in the PDF
        for page_layout in extract_pages(pdf_file, laparams=LAParams()):
            for element in page_layout:
                if isinstance(element, (LTTextBox, LTTextLine)):
                    # Get text lines from each text element
                    line_text = element.get_text().strip()
                    if line_text:
                        extracted_lines.append(line_text)
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return []
    return extracted_lines

#--------------------------------------------------------------------------    HASHTAG
def extract_text_from_pdf(file_path):
    try:
        # Extract text from PDF
        text = extract_text(file_path)
        # Split the text into lines
        lines = text.split('\n')
        return lines
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return []

def extract_text_from_image(file_path):
    try:
        # Open image file
        img = Image.open(file_path)
        # Extract text using Tesseract
        text = pytesseract.image_to_string(img)
        # Split the text into lines
        lines = text.split('\n')
        return lines
    except Exception as e:
        print(f"Error extracting text from image: {e}")
        return []

def create_hashtags_from_lines(lines):
    hashtags = []
    for line in lines:
        line = line.strip()
        if line:
            # Tokenize the line into words
            words = re.findall(r'\w+', line)
            # Remove stop words and create hashtags from remaining words
            filtered_words = [word for word in words if word.lower() not in stop_words]
            if filtered_words:
                # Join the remaining words with underscores
                hashtag = '#{}'.format('_'.join(filtered_words))
                hashtags.append(hashtag)
    return list(set(hashtags))


##################################################################################        UPLOAD
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400

    file = request.files['file']
    selection = request.form.get('selection', 'id')  

    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    if file:
        filename = file.filename
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        if filename.endswith('.pdf'):
            if selection == 'id':
                data = extract_ids_from_pdf(file_path)
            elif selection == 'name':
                data = extract_names_from_pdf(file_path)
            else:
                return jsonify({'message': 'Invalid selection type'}), 400
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            if selection == 'id':
                data = extract_ids_from_excel(file_path)
            elif selection == 'name':
                data = extract_names_from_excel(file_path)
            else:
                return jsonify({'message': 'Invalid selection type'}), 400
        
        else:
            return jsonify({'message': 'Unsupported file type'}), 400
        cleaned_data = []
        for item in data:
            # Remove unwanted characters, e.g., parentheses, special symbols
            cleaned_item = re.sub(r'[(){}\[\],;]', '', item).strip()  # Adjust regex as needed
            if cleaned_item:  # Only add non-empty items
                cleaned_data.append(cleaned_item)
        
        print("MENTOR DATA:", cleaned_data)
        return jsonify({'data': cleaned_data})

    return jsonify({'message': 'Failed to upload file'}), 500

##################################################################################        HASHTAG

@app.route('/autohash', methods=['POST'])
def extract_hashtags():
    data = request.json
    print(data)
    temp = data.get('filePath')
    mode = data.get('mode')
    
    # Correctly construct the absolute file path
    file_path = os.path.abspath(temp)
    print(f"Constructed file path: {file_path}")

    # Ensure the file exists
    if not os.path.isfile(file_path):
        print('File not found:', file_path)
        return jsonify({"error": "File not found"}), 404

    try:
        if mode == 'pdf':
            lines = extract_text_from_pdf(file_path)
        elif mode == 'image':
            lines = extract_text_from_image(file_path)
        else:
            return jsonify({"error": "Invalid mode"}), 400
        
        return jsonify({"lines": lines})
    
    except Exception as e:
        print(f"Error processing file: {e}")
        return jsonify({"error": "Failed to extract hashtags"}), 500


    

##################################################################################        CREDLY BADGES

@app.route("/fetch-badges", methods=['GET'])
def fetch_badges_2():
    url = request.args.get('url') + '/badges'
    if not url:
        return jsonify({'error': "Url not provided"}), 400
    try:
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})

        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')

            # Find all badge elements (anchor tags containing badges)
            badges = soup.find_all('a', class_='c-grid-item c-grid-item--stack-lt-sm cr-public-earned-badge-grid-item')
            certificates = []
            
            for badge in badges:
                # Extract details for each badge
                content = badge.find('div', class_='cr-standard-grid-item-content')
                title = content.find('div', class_='cr-standard-grid-item-content__title')
                subtitle = content.find('div', class_='cr-standard-grid-item-content__subtitle')
                image = content.find('img', class_='cr-standard-grid-item-content__image')
                
                # Construct the full badge URL
                badge_url = f"https://www.credly.com{badge['href']}" if badge.get('href') else 'N/A'

                # Get issue date by making a request to the badge URL
                issue_date = 'N/A'
                if badge_url != 'N/A':
                    try:
                        badge_response = requests.get(badge_url, headers={'User-Agent': 'Mozilla/5.0'})
                        if badge_response.status_code == 200:
                            badge_soup = BeautifulSoup(badge_response.text, 'html.parser')
                            date_element = badge_soup.find('div', class_='date')
                            if date_element:
                                issue_date = date_element.text.strip()
                    except:
                        pass

                certificates.append({
                    'certificate_name': title.text.strip() if title else 'N/A',
                    'issuer_name': subtitle.text.strip() if subtitle else 'N/A',
                    'badge_url': badge_url,
                    'image_url': image['src'] if image else 'N/A',
                    'issue_date': issue_date
                })


            return jsonify(certificates), 200
        elif response.status_code != 200:
            return jsonify({"error": f"Scrapper status code {response.status_code}"}), 500
    except Exception as e:
        return jsonify({"error": f"Internal server error, {str(e)}"}), 500
 
##################################################################################         Validate certificate

@app.route('/validate-certificate-two', methods=['POST'])
def validate_certificate_two():
    try:
        # Get the JSON data from the request
        data = request.json
        username = data.get('username')
        filename = data.get('filename')
        
        if not username or not filename:
            return jsonify({'error': 'Username and filename are required'}), 400
        
        base_dir = 'uploads'  # Update this path to the actual base directory
        file_path = os.path.join(base_dir, username, secure_filename(filename))
        print("The original file path:", file_path)
        
        # Ensure the file exists
        if not os.path.isfile(file_path):
            print("File not found at validate certificate")
            return jsonify({'error': 'File not found'}), 404
        
        # Process the PDF file to extract features
        features = extract_font_information_with_metadata_and_images(file_path)
        if not features:
            return jsonify({'error': 'No features extracted from PDF'}), 500
        
        # Prepare data for prediction
        df = prepare_data_for_prediction(features)
        
        # Apply preprocessing and make predictions
        X_processed = preprocessor.transform(df)
        predictions = model.predict(X_processed)
        
        # Determine the final result
        all_real = True
        fake_producer = None
        
        for i, pred in enumerate(predictions):
            if pred <= 0.5:
                all_real = False
                fake_producer = features[i]['Producer']
                break
        
        # Return the result based on prediction
        if all_real:
            return jsonify({"result": "Real"})
        else:
            return jsonify({"result": "Fake", "Edited_By": f"{fake_producer}"})
    
    except Exception as e:
        # Log the exception for debugging
        print("Exception occurred:", traceback.format_exc())
        return jsonify({'error': str(e)}), 500

############################################################################################################## EXTRACT LINES    

@app.route("/checkcertlevel",methods=['POST'])
def checkcertlevel():
    data = request.json
    temp = data.get('filePath')
    file_path = os.path.abspath(temp)
    if not os.path.isfile(file_path):
        print('File not found:', file_path)
        return jsonify({"error": "File not found"}), 404
    
    lines = extract_text_from_pdf(file_path)
    keywords_local = [
        "essentials", "introduction", "fundamentals", 
        "training", "student level", "attended", "attendance"
    ]
    
    keywords_global = [
        "earned", "cpe"
    ]
    
    keywords_sports = [
        "sports", "athletics", "tournament", "match", 
        "competition", "winner", "runner", "medal"
    ]

    keywords_intern_job_enterprenuer = [
        "intern" , "internship" , "trainee"
    ]
    
    # Determine the type of certificate
    if any(keyword.lower() in ' '.join(lines).lower() for keyword in keywords_sports):
        cert_type = "sports"
        level = ""  # Sports certificates might not have levels
    else:
        cert_type = "academic"
        level = "local" if any(keyword.lower() in ' '.join(lines).lower() for keyword in keywords_local) else ""
        if not level:
            level = "global" if any(keyword.lower() in ' '.join(lines).lower() for keyword in keywords_global) else ""

    return jsonify({
        "sutype": level,
        "type": cert_type,
        "lines": lines
    })


if __name__ == '__main__':
    app.run(port=5000)
