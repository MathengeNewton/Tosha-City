# Use Node.js 20 LTS for building
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy the rest of the project files
COPY . .

# Set production environment for build
ENV NODE_ENV=production

# Set API URL for build (can be overridden at runtime via env var)
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js app (standalone mode for production)
RUN npm run build

# Production stage - use Node.js to run Next.js server
FROM node:20-slim

WORKDIR /app

# Copy necessary files for standalone build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Start Next.js server
CMD ["node", "server.js"]
