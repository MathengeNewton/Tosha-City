# Use Node.js 20 LTS for building
FROM node:20-slim AS builder

WORKDIR /app

# Cap memory so build doesn't max out server; disable telemetry
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files first (better layer cache when only code changes)
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 120000 && \
    npm config set fetch-retries 3 && \
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy the rest of the project files
COPY . .

ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL=http://localhost:4515/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build (next.config has webpackMemoryOptimizations + webpackBuildWorker)
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
