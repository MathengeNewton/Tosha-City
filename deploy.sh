#!/bin/bash

# ToshaCity Butchery - Production Deployment Script
# This script should be run on the production server

set -e

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production file not found!${NC}"
    echo "Please create .env.production file with required environment variables."
    exit 1
fi

# Checkout development branch
echo -e "${YELLOW}📦 Checking out development branch...${NC}"
git fetch origin
git checkout development || git checkout -b development origin/development

# Pull latest code
echo -e "${YELLOW}⬇️  Pulling latest code from development branch...${NC}"
git pull origin development

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Copy production nginx config
echo -e "${YELLOW}📝 Copying production nginx configuration...${NC}"
cp proxy/nginx.prod.conf proxy/nginx.conf

# Pull latest images (if using registry)
if [ ! -z "$DOCKER_REGISTRY" ]; then
    echo -e "${YELLOW}📥 Pulling latest images from registry...${NC}"
    docker pull ${DOCKER_REGISTRY}/toshacity-backend:latest || true
    docker pull ${DOCKER_REGISTRY}/toshacity-frontend:latest || true
    docker pull ${DOCKER_REGISTRY}/toshacity-proxy:latest || true
fi

# Detect docker-compose command (v1 or v2)
if command -v docker-compose > /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ docker-compose is not installed or not in PATH${NC}"
    echo "Please install docker-compose or Docker with compose plugin"
    exit 1
fi

echo -e "${GREEN}Using: $COMPOSE_CMD${NC}"

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$COMPOSE_CMD -f docker-compose.prod.yml down || true

# Rebuild and start services
echo -e "${YELLOW}🔨 Rebuilding and starting services...${NC}"
$COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production up -d --build

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 15

# Health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"

# Check backend (using production URL from env or default)
BACKEND_URL=${NEXT_PUBLIC_API_URL:-https://apis.toshacity.co.ke/api}
if curl -f ${BACKEND_URL}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    $COMPOSE_CMD -f docker-compose.prod.yml logs backend
    exit 1
fi

# Check frontend (using production URL from env or default)
FRONTEND_URL=${FRONTEND_URL:-https://admin.toshacity.co.ke}
if curl -f ${FRONTEND_URL} > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    $COMPOSE_CMD -f docker-compose.prod.yml logs frontend
    exit 1
fi

# Clean up old images
echo -e "${YELLOW}🧹 Cleaning up old Docker images...${NC}"
docker image prune -f

# Show running containers
echo -e "${GREEN}📊 Current container status:${NC}"
$COMPOSE_CMD -f docker-compose.prod.yml ps

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

