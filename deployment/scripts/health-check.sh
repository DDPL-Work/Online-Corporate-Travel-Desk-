#!/bin/bash
set -euo pipefail

# =============================================================================
# Health Check Script
# Called via SSH from GitHub Actions
# Expects: health-check.sh <server_ip> <app_path>
# =============================================================================

SERVER_IP="${1:?Usage: health-check.sh <server_ip> <app_path>}"
APP_PATH="${2:?Usage: health-check.sh <server_ip> <app_path>}"
HEALTH_ENDPOINT="http://localhost:5000/health"
FRONTEND_ENDPOINT="http://localhost:80/"
MAX_RETRIES=3
RETRY_DELAY=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[HEALTH CHECK]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[HEALTH CHECK] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[HEALTH CHECK] ERROR:${NC} $1"
    exit 1
}

# =============================================================================
# API Health Check
# =============================================================================

log "Checking API health on ${SERVER_IP}..."

for i in $(seq 1 $MAX_RETRIES); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log "API health check passed (HTTP ${HTTP_CODE})"
        API_HEALTHY=true
        break
    fi
    
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        error "API health check failed after ${MAX_RETRIES} attempts (last HTTP: ${HTTP_CODE})"
    fi
    
    warn "API health check attempt $i failed (HTTP ${HTTP_CODE}), retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
done

# =============================================================================
# Frontend Health Check
# =============================================================================

log "Checking frontend health on ${SERVER_IP}..."

for i in $(seq 1 $MAX_RETRIES); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$FRONTEND_ENDPOINT" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log "Frontend health check passed (HTTP ${HTTP_CODE})"
        FRONTEND_HEALTHY=true
        break
    fi
    
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        error "Frontend health check failed after ${MAX_RETRIES} attempts (last HTTP: ${HTTP_CODE})"
    fi
    
    warn "Frontend health check attempt $i failed (HTTP ${HTTP_CODE}), retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
done

# =============================================================================
# PM2 Process Check
# =============================================================================

log "Checking PM2 processes..."

PM2_STATUS=$(pm2 list 2>/dev/null || echo "")
if echo "$PM2_STATUS" | grep -q "travel-api.*online"; then
    log "PM2 process travel-api is online"
else
    error "PM2 process travel-api is not online"
fi

# =============================================================================
# Disk Space Check
# =============================================================================

log "Checking disk space..."

DISK_USAGE=$(df -h "$APP_PATH" 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
if [ -n "$DISK_USAGE" ] && [ "$DISK_USAGE" -gt 90 ]; then
    warn "Disk usage is high: ${DISK_USAGE}%"
elif [ -n "$DISK_USAGE" ]; then
    log "Disk usage: ${DISK_USAGE}%"
fi

# =============================================================================
# Memory Check
# =============================================================================

log "Checking memory usage..."

MEMORY_USAGE=$(free -m 2>/dev/null | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ -n "$MEMORY_USAGE" ] && [ "$MEMORY_USAGE" -gt 90 ]; then
    warn "Memory usage is high: ${MEMORY_USAGE}%"
elif [ -n "$MEMORY_USAGE" ]; then
    log "Memory usage: ${MEMORY_USAGE}%"
fi

# =============================================================================
# Summary
# =============================================================================

log "Health check completed successfully!"
log "  API: healthy"
log "  Frontend: healthy"
log "  PM2: running"
