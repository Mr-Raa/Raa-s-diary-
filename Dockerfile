# Multi-stage resilient Dockerfile for Raa's Diary
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definition
COPY package.json ./

# Install all dependencies needed for build
RUN npm install --no-audit --no-fund

# Copy full application code (including pre-built dist)
COPY . .

# Ensure dist exists (build if missing)
RUN if [ ! -f "dist/index.html" ]; then npm run build; fi

# Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV PORT=3000
ENV DATA_DIR=/app/data

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund || npm install --no-audit

# Copy built app and dist from builder
COPY --from=builder /app /app

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
