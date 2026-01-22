#!/bin/bash

# ToshaCity Butchery - Complete Cleanup Script
# This script removes ALL data: containers, volumes, images, uploaded files, and build artifacts
# ⚠️  WARNING: This will delete ALL database data and uploaded files!

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Confirmation prompt
log_warning "=========================================="
log_warning "  COMPLETE SYSTEM CLEANUP"
log_warning "=========================================="
log_warning ""
log_warning "This will DELETE:"
log_warning "  • All Docker containers"
log_warning "  • All Docker volumes (including database data)"
log_warning "  • All Docker images"
log_warning "  • All uploaded files"
log_warning "  • All build artifacts"
log_warning ""
log_warning "⚠️  THIS CANNOT BE UNDONE! ⚠️"
log_warning ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    log_info "Cleanup cancelled."
    exit 0
fi

# Detect docker-compose command (v1 or v2)
if command -v docker-compose > /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    log_error "docker-compose is not installed"
    exit 1
fi

log_info "Using: $COMPOSE_CMD"

# Step 1: Stop and remove containers
log "Step 1: Stopping and removing containers..."
$COMPOSE_CMD -f docker-compose.yml down --remove-orphans 2>/dev/null || true
$COMPOSE_CMD -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
log_success "Containers stopped and removed"

# Step 2: Remove volumes (including database data)
log "Step 2: Removing Docker volumes..."
docker volume rm toshacity_db_data 2>/dev/null || true
docker volume rm toshacity-db_data 2>/dev/null || true
# Remove any other volumes with toshacity prefix
docker volume ls -q | grep -i toshacity | xargs -r docker volume rm 2>/dev/null || true
log_success "Volumes removed"

# Step 3: Remove images
log "Step 3: Removing Docker images..."
docker rmi toshacity-backend toshacity-frontend 2>/dev/null || true
docker rmi tosha-city-backend tosha-city-frontend 2>/dev/null || true
# Remove images by pattern
docker images | grep -i toshacity | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
log_success "Images removed"

# Step 4: Remove networks
log "Step 4: Removing Docker networks..."
docker network rm toshacity_app-network 2>/dev/null || true
docker network rm tosha-city_app-network 2>/dev/null || true
docker network ls -q | grep -i toshacity | xargs -r docker network rm 2>/dev/null || true
log_success "Networks removed"

# Step 5: Clean uploaded files
log "Step 5: Removing uploaded files..."
if [ -d "backend/uploads" ]; then
    rm -rf backend/uploads/*
    log_success "Uploaded files removed"
else
    log_info "No uploads directory found"
fi

# Step 6: Clean build artifacts
log "Step 6: Removing build artifacts..."

# Backend build artifacts
if [ -d "backend/dist" ]; then
    rm -rf backend/dist
    log_success "Backend dist removed"
fi

if [ -d "backend/node_modules" ]; then
    log_warning "Removing backend node_modules (this may take a while)..."
    rm -rf backend/node_modules
    log_success "Backend node_modules removed"
fi

# Frontend build artifacts
if [ -d "frontend/.next" ]; then
    rm -rf frontend/.next
    log_success "Frontend .next removed"
fi

if [ -d "frontend/node_modules" ]; then
    log_warning "Removing frontend node_modules (this may take a while)..."
    rm -rf frontend/node_modules
    log_success "Frontend node_modules removed"
fi

# Step 7: Docker system prune (optional but thorough)
log "Step 7: Running Docker system prune..."
docker system prune -af --volumes 2>/dev/null || true
log_success "Docker system pruned"

# Step 8: Clean any remaining Docker resources
log "Step 8: Cleaning remaining Docker resources..."
# Remove any stopped containers
docker container prune -f 2>/dev/null || true
# Remove unused volumes
docker volume prune -f 2>/dev/null || true
log_success "Remaining resources cleaned"

# Summary
log ""
log_success "=========================================="
log_success "  CLEANUP COMPLETE!"
log_success "=========================================="
log ""
log_info "Removed:"
log_info "  ✅ All containers"
log_info "  ✅ All volumes (database data)"
log_info "  ✅ All images"
log_info "  ✅ All uploaded files"
log_info "  ✅ All build artifacts"
log_info "  ✅ All networks"
log ""
log_info "You can now start fresh with:"
log_info "  ./start-services.sh --dev    (for development)"
log_info "  ./start-services.sh          (for production)"
log ""
