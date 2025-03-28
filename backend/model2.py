import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from pdfminer.layout import LAParams, LTTextBox, LTTextLine, LTChar
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.converter import PDFPageAggregator
from pdfminer.pdfpage import PDFPage
import fitz
import os

# Load the saved Keras model
model = load_model(r"C:\Users\USER\OneDrive\Desktop\Eduflex\Eduflex\backend\certificate_indentifier.keras")

# Define preprocessing steps
categorical_features = ['Font Style', 'Producer']
numerical_features = ['Font Size', 'Color', 'Image Count', 'x0', 'y0', 'x1', 'y1']

categorical_transformer = OneHotEncoder(handle_unknown='ignore')
numerical_transformer = StandardScaler()

preprocessor = ColumnTransformer(
    transformers=[
        ('num', numerical_transformer, numerical_features),
        ('cat', categorical_transformer, categorical_features)
    ])

# Load training data to fit the preprocessor
real_data = pd.read_csv(r"C:\Users\USER\OneDrive\Desktop\Eduflex\Eduflex\backend\real_cert.csv")
fake_data = pd.read_csv(r"C:\Users\USER\OneDrive\Desktop\Eduflex\Eduflex\backend\fake_cert.csv")
data = pd.concat([real_data, fake_data], ignore_index=True)

# Rename columns to match expected names
data.rename(columns={
    "Char_x0": "x0",
    "Char_y0": "y0",
    "Char_x1": "x1",
    "Char_y1": "y1"
}, inplace=True)

X = data.drop(columns=['Label', 'Text'])
preprocessor.fit(X)

def extract_metadata(pdf_file):
    """Extract metadata from the PDF file."""
    try:
        document = fitz.open(pdf_file)
        metadata = document.metadata
        return metadata
    except Exception as e:
        print(f"Error extracting metadata from {pdf_file}: {e}")
        return {}

def extract_font_information(pdf_file):
    """Extract font information along with text coordinates using pdfminer and fallback to PyMuPDF."""
    font_data = []
    try:
        # Attempt extraction with pdfminer
        with open(pdf_file, 'rb') as file:
            rsrcmgr = PDFResourceManager()
            laparams = LAParams()
            device = PDFPageAggregator(rsrcmgr, laparams=laparams)
            interpreter = PDFPageInterpreter(rsrcmgr, device)
            for page in PDFPage.get_pages(file):
                interpreter.process_page(page)
                layout = device.get_result()
                for element in layout:
                    if isinstance(element, (LTTextBox, LTTextLine)):
                        for text_line in element:
                            line_text = text_line.get_text().strip()
                            x0, y0, x1, y1 = text_line.bbox  # Get the coordinates of the text line
                            for char in text_line:
                                if isinstance(char, LTChar):
                                    color = getattr(char.graphicstate, 'ncolor', 'Unknown')
                                    color = np.mean(color) if isinstance(color, (tuple, list, np.ndarray)) else float(color)
                                    font_data.append({
                                        "Text": line_text,
                                        "Font Style": char.fontname,
                                        "Font Size": float(char.size),
                                        "Color": float(color),
                                        "x0": x0,
                                        "y0": y0,
                                        "x1": x1,
                                        "y1": y1,
                                        "Label": 1
                                    })
    except Exception as e:
        print(f"Error with pdfminer: {e}")
        # Fallback to fitz (PyMuPDF)
        try:
            document = fitz.open(pdf_file)
            for page_number in range(len(document)):
                page = document.load_page(page_number)
                blocks = page.get_text('dict')['blocks']
                for block in blocks:
                    if block['type'] == 0:
                        for line in block['lines']:
                            for span in line['spans']:
                                text = span['text']
                                font_style = span['font']
                                font_size = span['size']
                                color = span.get('color', 'Unknown')
                                x0 = span['bbox'][0]  # Starting x-coordinate
                                y0 = span['bbox'][1]  # Starting y-coordinate
                                x1 = span['bbox'][2]  # Ending x-coordinate
                                y1 = span['bbox'][3]  # Ending y-coordinate

                                color = sum(color) / len(color) if isinstance(color, (tuple, list)) else float(color)
                                font_data.append({
                                    "Text": text,
                                    "Font Style": font_style,
                                    "Font Size": float(font_size),
                                    "Color": float(color),
                                    "x0": x0,
                                    "y0": y0,
                                    "x1": x1,
                                    "y1": y1,
                                    "Label": 1
                                })
        except Exception as e:
            print(f"Error with fitz (PyMuPDF): {e}")
    return font_data

def extract_image_count(pdf_file):
    """Extract the count of images from the PDF file."""
    try:
        document = fitz.open(pdf_file)
        image_count = 0
        for page_num in range(len(document)):
            page = document[page_num]
            image_count += len(page.get_images(full=True))
        return image_count
    except Exception as e:
        print(f"Error counting images in {pdf_file}: {e}")
        return 0

def extract_font_information_with_metadata_and_images(pdf_file):
    """Extract font information, metadata, and image count from the PDF file."""
    metadata = extract_metadata(pdf_file)
    producer = str(metadata.get('producer', 'Unknown'))
    font_data = extract_font_information(pdf_file)
    image_count = extract_image_count(pdf_file)
    for entry in font_data:
        entry['Producer'] = producer
        entry['Image Count'] = image_count
    return font_data

def prepare_data_for_prediction(features):
    # Convert the list of features into a DataFrame
    df = pd.DataFrame(features)
    
    # Define the expected columns based on the model's preprocessing requirements
    expected_columns = [
        "Font Style", "Font Size", "Color", "Producer", "Image Count",
        "x0", "y0", "x1", "y1"
    ]
    
    # Ensure all expected columns are present in the DataFrame
    for col in expected_columns:
        if col not in df.columns:
            df[col] = np.nan  # Add missing columns with NaN values
    
    # Select and reorder columns based on the expected order
    df = df[expected_columns]
    
    # Convert necessary columns to appropriate data types
    df["Font Style"] = df["Font Style"].astype(str)
    df["Producer"] = df["Producer"].astype(str)
    
    # Fill missing values with defaults for numerical fields and 'Unknown' for categorical
    df.fillna({
        "Font Style": "Unknown",
        "Producer": "Unknown",
        "Font Size": 0,
        "Color": 0,
        "Image Count": 0,
        "x0": 0,
        "y0": 0,
        "x1": 0,
        "y1": 0
    }, inplace=True)
    
    return df

# Example usage
# pdf_file_path = "path_to_your_pdf_file.pdf"
# features = extract_font_information_with_metadata_and_images(pdf_file_path)
# prepared_data = prepare_data_for_prediction(features)
# predictions = model.predict(preprocessor.transform(prepared_data))
# print(predictions)
