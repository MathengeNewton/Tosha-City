#!/bin/bash

# ToshaCity Butchery - Sequential Service Startup Script
# Starts services one by one with health checks to optimize resource usage

# Don't exit on error - we want to continue even if health checks fail
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
MAX_RETRIES=30
RETRY_DELAY=2
HEALTH_CHECK_TIMEOUT=5

# Logging functions (define before use)
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

# Allow override via command line
if [ "$1" = "--dev" ] || [ "$1" = "-d" ]; then
    COMPOSE_FILE="docker-compose.yml"
    ENV_FILE=".env"
    log_info "Using development configuration"
fi

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

# Check if env file exists (if specified)
if [ -n "$ENV_FILE" ]; then
    if [ ! -f "$ENV_FILE" ]; then
        log_error "$ENV_FILE not found!"
        log_error "This file is REQUIRED for production deployment."
        log_error ""
        log_error "Please create $ENV_FILE with the following variables:"
        log_error "  - DATABASE_USER"
        log_error "  - DATABASE_PASSWORD (REQUIRED)"
        log_error "  - DATABASE_NAME"
        log_error "  - JWT_SECRET (REQUIRED)"
        log_error "  - JWT_EXPIRES_IN"
        log_error "  - FRONTEND_URL"
        log_error "  - NEXT_PUBLIC_API_URL"
        log_error ""
        log_error "See GITHUB_SECRETS.md for details on what values to use."
        log_error ""
        log_error "Example:"
        log_error "  cat > $ENV_FILE << 'EOF'"
        log_error "  DATABASE_USER=toshacity"
        log_error "  DATABASE_PASSWORD=your_secure_password_here"
        log_error "  DATABASE_NAME=toshacity_butchery"
        log_error "  JWT_SECRET=your_jwt_secret_here"
        log_error "  JWT_EXPIRES_IN=7d"
        log_error "  FRONTEND_URL=https://admin.toshacity.co.ke"
        log_error "  NEXT_PUBLIC_API_URL=https://apis.toshacity.co.ke/api"
        log_error "  EOF"
        exit 1
    else
        log_info "Loading environment variables from $ENV_FILE"
        # Load env vars (handle values with spaces/special chars)
        set -a
        source "$ENV_FILE"
        set +a
    fi
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
if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
    COMPOSE_CMD="$COMPOSE_CMD --env-file $ENV_FILE"
    # Also export variables for direct access in script
    log_info "Environment file loaded: $ENV_FILE"
    log_info "Verifying critical variables..."
    if [ -z "$DATABASE_PASSWORD" ]; then
        log_error "DATABASE_PASSWORD is not set in $ENV_FILE"
        log_error "Please check your .env.production file"
        exit 1
    fi
    if [ -z "$JWT_SECRET" ]; then
        log_error "JWT_SECRET is not set in $ENV_FILE"
        log_error "Please check your .env.production file"
        exit 1
    fi
    log_success "Critical environment variables are set"
else
    log_warning "No environment file specified or found"
fi

log_info "Using: $COMPOSE_CMD_BASE"

log "🚀 Starting ToshaCity Butchery Services (Sequential Mode)"
log_info "Note: Nginx/proxy should be configured separately on the host"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Start Database
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "📦 Step 1/4: Starting Database..."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info "Starting database container..."
if ! $COMPOSE_CMD up -d db; then
    log_error "Failed to start database container"
    log_warning "Attempting to fix Docker Compose metadata issue..."
    $COMPOSE_CMD_BASE -f $COMPOSE_FILE down 2>/dev/null || true
    docker ps -a | grep toshacity | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true
    log_info "Retrying database startup..."
    $COMPOSE_CMD up -d db || {
        log_error "Database startup failed. Check Docker and try: $COMPOSE_CMD_BASE down --rmi all"
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

log_info "Starting backend container..."
if ! $COMPOSE_CMD up -d backend; then
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

log_info "Starting frontend container..."
if ! $COMPOSE_CMD up -d frontend; then
    log_error "Failed to start frontend container"
    $COMPOSE_CMD logs frontend | tail -20
    log_warning "Continuing anyway - will check health later..."
else
    log_info "Frontend container started, waiting for initialization..."
    sleep 5
fi


# Final Health Checks - After all services are up
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🏥 Running Health Checks (All Services)..."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Database
log "Checking database health..."
if $COMPOSE_CMD exec -T db pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
    log_success "Database is healthy"
else
    log_error "Database health check failed"
    $COMPOSE_CMD logs db | tail -20
fi

# Check Backend API (use production URL if available, otherwise internal container check)
if [ -n "$NEXT_PUBLIC_API_URL" ] && [[ "$NEXT_PUBLIC_API_URL" == http* ]]; then
    BACKEND_HEALTH_URL="${NEXT_PUBLIC_API_URL}/health"
    log "Checking backend API health via production URL: $BACKEND_HEALTH_URL"
else
    # Check via internal Docker network (container name)
    BACKEND_HEALTH_URL="http://backend:3000/api/health"
    log "Checking backend API health via internal network"
fi
log "Checking backend API health..."
if check_health "backend" "$BACKEND_HEALTH_URL" "Backend API"; then
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

# Check Frontend (use production URL if available, otherwise internal container check)
if [ -n "$FRONTEND_URL" ] && [[ "$FRONTEND_URL" == http* ]]; then
    FRONTEND_HEALTH_URL="$FRONTEND_URL"
else
    # Check via internal Docker network (container name)
    FRONTEND_HEALTH_URL="http://frontend:3000"
fi
log "Checking frontend health..."
if check_health "frontend" "$FRONTEND_HEALTH_URL" "Frontend Application"; then
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
log_success "All services started successfully!"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log ""
log_info "Services are running:"
log_info "  • Database: PostgreSQL (internal network)"
log_info "  • Backend API: https://apis.toshacity.co.ke/api"
log_info "  • Frontend: https://admin.toshacity.co.ke"
log_info ""
log_info "⚠️  Note: Configure nginx separately on the host to route traffic"
log ""
log_info "To view logs: $COMPOSE_CMD logs -f [service_name]"
log_info "To stop services: $COMPOSE_CMD down"
log ""

