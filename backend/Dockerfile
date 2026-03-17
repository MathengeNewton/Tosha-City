# Use full Node.js 20 image (slim can cause bus errors with @swc/core native bindings)
FROM node:20

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files and install all dependencies (needed for build)
# Extra memory for @swc/core postinstall; avoid bus error in Docker
COPY package*.json ./
# Cap heap so server isn't maxed when running frontend + backend
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm ci --omit=optional && npm cache clean --force

# Copy the rest of the project files
COPY . .

# Build the NestJS app
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Expose the port your app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

# Command to run the app
CMD ["npm", "run", "start:prod"]