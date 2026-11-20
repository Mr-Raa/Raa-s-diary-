# Multi-stage production Dockerfile for Raa's Diary
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci || npm install

# Copy source code
COPY . .

# Build frontend production bundle
RUN npm run build

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Create data directory for persistent SQLite database
RUN mkdir -p /app/data

# Copy built application and node_modules from builder
COPY --from=builder /app /app

EXPOSE 3000

# Start server using tsx
CMD ["npx", "tsx", "server.ts"]
