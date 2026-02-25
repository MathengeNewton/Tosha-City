#!/bin/bash

# ToshaCity Butchery - Local Development Script
# Starts services locally using localhost URLs

set +e  # Don't exit on error - continue even if health checks fail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
MAX_RETRIES=30
RETRY_DELAY=2
HEALTH_CHECK_TIMEOUT=5

# Local URLs
BACKEND_URL="http://localhost:4515/api"
FRONTEND_URL="http://localhost:3015"

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

# Health check function
check_health() {
    local service=$1
    local url=$2
    local description=$3
    
    log "Checking health of $description..."
    
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -f -s --max-time $HEALTH_CHECK_TIMEOUT "$url" > /dev/null 2>&1; then
            log_success "$description is healthy"
            return 0
        fi
        
        if [ $i -lt $MAX_RETRIES ]; then
            log_warning "Health check failed (attempt $i/$MAX_RETRIES), retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    log_error "$description health check failed after $MAX_RETRIES attempts"
    return 1
}

# Load environment variables if .env exists
if [ -f "$ENV_FILE" ]; then
    log_info "Loading environment variables from $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
else
    log_warning ".env file not found, using defaults from docker-compose.yml"
fi

# Detect docker-compose command (v1 or v2)
if command -v docker-compose > /dev/null 2>&1; then
    COMPOSE_CMD_BASE="docker-compose"
elif docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD_BASE="docker compose"
else
    log_error "docker-compose is not installed or not in PATH"
    log_error "Please install docker-compose or Docker with compose plugin"
    exit 1
fi

# Build docker-compose command
COMPOSE_CMD="$COMPOSE_CMD_BASE -f $COMPOSE_FILE"
if [ -f "$ENV_FILE" ]; then
    COMPOSE_CMD="$COMPOSE_CMD --env-file $ENV_FILE"
fi

log_info "Using: $COMPOSE_CMD_BASE"

log "🚀 Starting ToshaCity Butchery - Local Development"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Start Database
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "📦 Step 1/3: Starting Database..."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info "Starting database container..."
if ! $COMPOSE_CMD up -d db; then
    log_error "Failed to start database container"
    log_warning "Attempting to fix Docker Compose metadata issue..."
    $COMPOSE_CMD_BASE -f $COMPOSE_FILE down 2>/dev/null || true
    docker ps -a | grep toshacity | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true
    log_info "Retrying database startup..."
    $COMPOSE_CMD up -d db || {
        log_error "Database startup failed. Check Docker and try: $COMPOSE_CMD_BASE down"
        exit 1
    }
fi

log "Waiting for database to be ready..."
DB_USER=${DATABASE_USER:-toshacity}
DB_NAME=${DATABASE_NAME:-toshacity_butchery}

for i in $(seq 1 $MAX_RETRIES); do
    if $COMPOSE_CMD exec -T db pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
        log_success "Database is ready"
        break
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        log_error "Database failed to start within expected time"
        $COMPOSE_CMD logs db | tail -20
        log_warning "Continuing anyway - will check health later..."
    fi
    
    log_warning "Database not ready yet (attempt $i/$MAX_RETRIES), waiting..."
    sleep $RETRY_DELAY
done

# Step 2: Start Backend
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🔧 Step 2/3: Starting Backend API..."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info "Building and starting backend container..."
if ! $COMPOSE_CMD up -d --build backend; then
    log_error "Failed to start backend container"
    $COMPOSE_CMD logs backend | tail -20
    log_warning "Continuing anyway - will check health later..."
else
    log_info "Backend container started, waiting for initialization..."
    sleep 5
fi

# Step 3: Start Frontend
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🎨 Step 3/3: Starting Frontend..."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info "Building and starting frontend container (rebuilding to ensure correct API URL)..."
# Force rebuild without cache to ensure NEXT_PUBLIC_API_URL is updated
$COMPOSE_CMD build --no-cache frontend
if ! $COMPOSE_CMD up -d frontend; then
    log_error "Failed to start frontend container"
    $COMPOSE_CMD logs frontend | tail -20
    log_warning "Continuing anyway - will check health later..."
else
    log_info "Frontend container started, waiting for initialization..."
    sleep 5
fi

# Final Health Checks
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🏥 Running Health Checks..."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Database
log "Checking database health..."
if $COMPOSE_CMD exec -T db pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
    log_success "Database is healthy"
else
    log_error "Database health check failed"
    $COMPOSE_CMD logs db | tail -20
fi

# Check Backend API
log "Checking backend API health at $BACKEND_URL/health..."
if check_health "backend" "$BACKEND_URL/health" "Backend API"; then
    log_success "Backend API is responding"
else
    log_error "Backend API health check failed"
    log_info "Checking container status..."
    if $COMPOSE_CMD ps backend | grep -q "Up"; then
        log_warning "Backend container is running but not responding"
        $COMPOSE_CMD logs backend | tail -20
    else
        log_error "Backend container is not running"
        $COMPOSE_CMD logs backend | tail -20
    fi
fi

# Check Frontend
log "Checking frontend health at $FRONTEND_URL..."
if check_health "frontend" "$FRONTEND_URL" "Frontend Application"; then
    log_success "Frontend is responding"
else
    log_error "Frontend health check failed"
    log_info "Checking container status..."
    if $COMPOSE_CMD ps frontend | grep -q "Up"; then
        log_warning "Frontend container is running but not responding"
        $COMPOSE_CMD logs frontend | tail -20
    else
        log_error "Frontend container is not running"
        $COMPOSE_CMD logs frontend | tail -20
    fi
fi

# Show container status
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "📊 Container Status:"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
$COMPOSE_CMD ps

log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "Local development environment is ready!"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log ""
log_info "Services are running:"
log_info "  • Database: PostgreSQL (localhost:5432)"
log_info "  • Backend API: $BACKEND_URL"
log_info "  • Frontend: $FRONTEND_URL"
log_info ""
log_info "To view logs: $COMPOSE_CMD logs -f [service_name]"
log_info "To stop services: $COMPOSE_CMD down"
log ""
