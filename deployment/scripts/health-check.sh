#!/bin/bash
set -euo pipefail

# =============================================================================
# Health Check Script
# Comprehensive health verification for the application stack
# =============================================================================

# Environment variables
APP_PATH="${APP_PATH:-/var/www/Online-Corporate-Travel-Desk-}"
API_URL="${API_URL:-http://localhost:5000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:80}"
ADMIN_URL="${ADMIN_URL:-http://localhost:80}"
LOG_DIR="${LOG_DIR:-${APP_PATH}/logs}"

# =============================================================================
# Logging Initialization (must happen before ANY log calls)
# =============================================================================

mkdir -p "${LOG_DIR}" || {
    echo "ERROR: Failed to create log directory ${LOG_DIR}"
    exit 1
}

[[ -d "${LOG_DIR}" ]] || {
    echo "ERROR: Log directory does not exist after creation: ${LOG_DIR}"
    exit 1
}

[[ -w "${LOG_DIR}" ]] || {
    echo "ERROR: Log directory is not writable: ${LOG_DIR}"
    exit 1
}

chmod 775 "${LOG_DIR}" 2>/dev/null || true

HEALTH_LOG="${LOG_DIR}/health-check-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$HEALTH_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$HEALTH_LOG"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$HEALTH_LOG"
}

check_pass() {
    echo -e "${GREEN}  [PASS]${NC} $1" | tee -a "$HEALTH_LOG"
    PASS_COUNT=$((PASS_COUNT + 1))
}

check_fail() {
    echo -e "${RED}  [FAIL]${NC} $1" | tee -a "$HEALTH_LOG"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

check_warn() {
    echo -e "${YELLOW}  [WARN]${NC} $1" | tee -a "$HEALTH_LOG"
    WARN_COUNT=$((WARN_COUNT + 1))
}

# =============================================================================
# Health Checks
# =============================================================================

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

log "=========================================="
log "Application Health Check"
log "=========================================="
log "Time: $(date)"
log "Host: $(hostname)"
log ""

# --- API Health ---
log "Checking API health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$API_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    check_pass "API health endpoint responding (HTTP ${HTTP_CODE})"
else
    check_fail "API health endpoint not responding (HTTP ${HTTP_CODE}) — API may be down or port 5000 not reachable"
fi

# --- Frontend Health ---
log "Checking frontend health..."
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$FRONTEND_CODE" = "200" ] || [ "$FRONTEND_CODE" = "301" ] || [ "$FRONTEND_CODE" = "302" ]; then
    check_pass "Frontend responding (HTTP ${FRONTEND_CODE})"
else
    check_fail "Frontend not responding (HTTP ${FRONTEND_CODE}) — nginx may not be running or port 80 not reachable"
fi

# --- PM2 Process Check ---
log "Checking PM2 processes..."
if command -v pm2 &>/dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null || echo "[]")
    
    # Check travel-api
    if echo "$PM2_STATUS" | grep -q '"name":"travel-api".*"pm2_env":{[^}]*"status":"online"'; then
        check_pass "PM2 process travel-api is online"
    elif echo "$PM2_STATUS" | grep -q '"name":"travel-api"'; then
        check_warn "PM2 process travel-api exists but may not be online"
    else
        check_fail "PM2 process travel-api not found"
    fi
    
    # Check all online processes
    ONLINE_COUNT=$(echo "$PM2_STATUS" | grep -c '"status":"online"' 2>/dev/null || echo "0")
    TOTAL_COUNT=$(echo "$PM2_STATUS" | grep -c '"name":' 2>/dev/null || echo "0")
    log "  PM2: ${ONLINE_COUNT}/${TOTAL_COUNT} processes online"
else
    check_fail "PM2 not installed or not in PATH"
fi

# --- Disk Space ---
log "Checking disk space..."
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
DISK_AVAIL=$(df -h / | tail -1 | awk '{print $4}')
if [ "$DISK_USAGE" -lt 80 ]; then
    check_pass "Disk usage: ${DISK_USAGE}% (${DISK_AVAIL} available)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    check_warn "Disk usage: ${DISK_USAGE}% (${DISK_AVAIL} available) — getting high"
else
    check_fail "Disk usage: ${DISK_USAGE}% (${DISK_AVAIL} available) — critically low"
fi

# --- Memory Usage ---
log "Checking memory usage..."
MEMORY_PERCENT=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
MEMORY_USED=$(free -h | awk '/Mem:/ {print $3}')
MEMORY_TOTAL=$(free -h | awk '/Mem:/ {print $2}')
if [ "$MEMORY_PERCENT" -lt 80 ]; then
    check_pass "Memory usage: ${MEMORY_PERCENT}% (${MEMORY_USED}/${MEMORY_TOTAL})"
elif [ "$MEMORY_PERCENT" -lt 90 ]; then
    check_warn "Memory usage: ${MEMORY_PERCENT}% (${MEMORY_USED}/${MEMORY_TOTAL}) — getting high"
else
    check_fail "Memory usage: ${MEMORY_PERCENT}% (${MEMORY_USED}/${MEMORY_TOTAL}) — critically low"
fi

# --- Node.js Process ---
log "Checking Node.js process..."
NODE_PID=$(pgrep -f "node.*server.js" 2>/dev/null || echo "")
if [ -n "$NODE_PID" ]; then
    check_pass "Node.js process running (PID: ${NODE_PID})"
else
    check_warn "No Node.js server process found — PM2 may use a different process name"
fi

# --- Port 5000 ---
log "Checking port 5000..."
if netstat -tuln 2>/dev/null | grep -q ":5000.*LISTEN"; then
    check_pass "Port 5000 is listening"
else
    check_fail "Port 5000 is not listening — server may not be running"
fi

# --- Port 80 ---
log "Checking port 80..."
if netstat -tuln 2>/dev/null | grep -q ":80.*LISTEN"; then
    check_pass "Port 80 is listening"
else
    check_fail "Port 80 is not listening — nginx may not be running"
fi

# --- Application Logs ---
log "Checking recent application logs..."
if [[ -f "${LOG_DIR}/error.log" ]]; then
    ERROR_LINES=$(tail -100 "${LOG_DIR}/error.log" 2>/dev/null | grep -ci "error" || echo "0")
    if [ "$ERROR_LINES" -gt 10 ]; then
        check_warn "Found ${ERROR_LINES} error lines in last 100 lines of error.log — check logs for details"
    else
        check_pass "Error log looks clean (${ERROR_LINES} errors in last 100 lines)"
    fi
else
    check_warn "Error log not found at ${LOG_DIR}/error.log"
fi

# --- Nginx Config ---
log "Checking nginx configuration..."
if command -v nginx &>/dev/null; then
    if nginx -t 2>/dev/null; then
        check_pass "Nginx configuration is valid"
    else
        check_fail "Nginx configuration test failed — check /etc/nginx/"
    fi
else
    check_warn "Nginx not installed or not in PATH"
fi

# --- File System ---
log "Checking application files..."
if [[ -f "${APP_PATH}/server/package.json" ]]; then
    check_pass "Server package.json exists"
else
    check_fail "Server package.json not found at ${APP_PATH}/server/package.json"
fi

# --- Summary ---
log ""
log "=========================================="
log "Health Check Summary"
log "=========================================="
log "  Passed: ${PASS_COUNT}"
log "  Failed: ${FAIL_COUNT}"
log "  Warnings: ${WARN_COUNT}"
log "  Health log: ${HEALTH_LOG}"
log ""

if [ "$FAIL_COUNT" -gt 0 ]; then
    error "Health check FAILED — ${FAIL_COUNT} checks failed"
    exit 1
elif [ "$WARN_COUNT" -gt 0 ]; then
    warn "Health check PASSED with ${WARN_COUNT} warnings"
    exit 0
else
    log "All checks passed!"
    exit 0
fi
