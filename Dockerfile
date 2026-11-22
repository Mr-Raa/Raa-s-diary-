# Production Dockerfile for Raa's Diary — Personal Life OS
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Copy package manifests
COPY package.json package-lock.json* ./

# Install dependencies needed for running the server
RUN npm install --no-audit --no-fund

# Copy all application code (including pre-built dist bundle)
COPY . .

# Ensure dist/ exists; build only if missing
RUN if [ ! -f "dist/index.html" ]; then npm run build; fi

# Create persistent data directory
RUN mkdir -p /app/data

EXPOSE 3000

# Start Raa's Diary server
CMD ["npx", "tsx", "server.ts"]
