# Build stage
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install git and clone repository
RUN apk add --no-cache git
RUN git clone https://github.com/Soham01011/Eduflex.git .

# Create required directories in builder stage
RUN mkdir -p /usr/src/app/backend/uploads

# Change to backend directory and install dependencies
WORKDIR /usr/src/app/backend
RUN npm install

# Production stage
FROM node:18-alpine AS production

WORKDIR /usr/src/app

# Copy only necessary files from builder
COPY --from=builder /usr/src/app/backend/middleware ./middleware
COPY --from=builder /usr/src/app/backend/models ./models
COPY --from=builder /usr/src/app/backend/public ./public
COPY --from=builder /usr/src/app/backend/routesGET ./routesGET
COPY --from=builder /usr/src/app/backend/routesPOST ./routesPOST
COPY --from=builder /usr/src/app/backend/utils ./utils
COPY --from=builder /usr/src/app/backend/views ./views
COPY --from=builder /usr/src/app/backend/package*.json ./
COPY --from=builder /usr/src/app/backend/server.js ./

# Create required directories in production stage
RUN mkdir -p /usr/src/app/apiuploads \
    /usr/src/app/uploads \
    /usr/src/app/hashtag_extractions

# Install production dependencies only
RUN npm ci --only=production

# Add volume mounts for persistent storage
VOLUME ["/usr/src/app/apiuploads", "/usr/src/app/uploads", "/usr/src/app/hashtag_extractions"]

# Expose port
EXPOSE 8000

# Start the server
CMD ["node", "server.js"]