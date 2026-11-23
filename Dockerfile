# Production Dockerfile for Raa's Diary — Personal Life OS
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Install unzip utility to support zip-based deployment
RUN apk add --no-cache unzip

# Copy package manifests
COPY package.json ./

# Install runtime dependencies (including tsx, express, react)
RUN npm install --no-audit --no-fund

# Copy all application files
COPY . .

# If any .zip archive is present (e.g. RAAS-DIARY.zip), auto-extract it
RUN sh -c 'for z in *.zip; do if [ -f "$z" ]; then echo "Extracting $z"; unzip -o "$z" -d /app; rm -f "$z"; fi; done'

# If dist/index.html is missing, install dev tools and build
RUN if [ ! -f "dist/index.html" ]; then npm install && npx vite build; fi

# Create persistent storage folder for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

# Launch Raa's Diary
CMD ["npx", "tsx", "server.ts"]
