import pdfplumber

# Points dictionary for classification
POINTS = {
    "global": 50,
    "internship": 30,
    "local": 10
}

# Keywords to identify certificate types
KEYWORDS = {
    "global": ["global", "https", "international", "worldwide"],
    "internship": ["internship", "training", "intern"],
    "local": ["local", "regional", "domestic"]
}

def classify_certificate(file_path):
    """
    Classifies a certificate PDF based on text content.
    :param file_path: Path to the PDF file.
    :return: Certificate type and assigned points.
    """
    try:
        with pdfplumber.open(file_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() or ""

            # Convert text to lowercase for case-insensitive matching
            text = text.lower()

            # Check for keywords in order of priority
            if any(keyword in text for keyword in KEYWORDS["global"]):
                return "global", POINTS["global"]
            elif any(keyword in text for keyword in KEYWORDS["internship"]):
                return "internship", POINTS["internship"]
            elif any(keyword in text for keyword in KEYWORDS["local"]):
                return "local", POINTS["local"]

            # Default fallback type: "local"
            return "local", POINTS["local"]

    except Exception as e:
        print(f"Error processing file {file_path}: {e}")
        return "error", 0
