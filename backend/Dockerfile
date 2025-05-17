# Build stage
FROM python:3.9-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    tesseract-ocr \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*


# Clone repository and debug file locations
RUN git clone https://github.com/Soham01011/Eduflex.git /tmp/eduflex && \
    cp -r /tmp/eduflex/backend/* /app/ && \
    echo "Listing files in /app:" && \
    ls -la /app/ && \
    rm -rf /tmp/eduflex

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install playwright dependencies
RUN pip install playwright && \
    playwright install && \
    playwright install-deps

# Production stage
FROM python:3.9-slim AS production

WORKDIR /app

# Copy necessary files and models from builder
COPY --from=builder /app/automation_server.py .
COPY --from=builder /app/model2.py .
COPY --from=builder /app/certificate_indentifier.keras .
COPY --from=builder /app/fake_cert.csv .
COPY --from=builder /app/real_cert.csv .

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages

# Create necessary directories
RUN mkdir -p /app/apiuploads \
    /app/hashtag_extraction \
    /app/uploads \
    /app/RLHF

# Create volume mount points
VOLUME ["/app/apiuploads", "/app/hashtag_extraction", "/app/uploads", "/app/RLHF"]

# Expose port
EXPOSE 5000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Start the Flask server
CMD ["python", "automation_server.py"]