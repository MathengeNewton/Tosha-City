#!/bin/bash
# Test script to verify env file loading

ENV_FILE=".env.production"
if [ -f "$ENV_FILE" ]; then
    echo "Loading $ENV_FILE..."
    set -a
    source "$ENV_FILE"
    set +a
    
    echo ""
    echo "Environment variables:"
    echo "  DATABASE_USER: ${DATABASE_USER:-NOT SET}"
    echo "  DATABASE_PASSWORD: ${DATABASE_PASSWORD:+SET (length: ${#DATABASE_PASSWORD})}"
    echo "  DATABASE_NAME: ${DATABASE_NAME:-NOT SET}"
    echo "  JWT_SECRET: ${JWT_SECRET:+SET (length: ${#JWT_SECRET})}"
    echo "  FRONTEND_URL: ${FRONTEND_URL:-NOT SET}"
    echo "  NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-NOT SET}"
else
    echo "ERROR: $ENV_FILE not found!"
fi
