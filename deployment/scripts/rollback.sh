#!/bin/bash
set -euo pipefail

# =============================================================================
# Rollback Script
# Rolls back to a previous release (git tag or timestamped directory)
# =============================================================================

# Environment variables passed from GitHub Actions
APP_PATH="${APP_PATH:?APP_PATH is required}"
ROLLBACK_TARGET="${ROLLBACK_TARGET:?ROLLBACK_TARGET is required}"
ROLLBACK_CONFIRMED="${ROLLBACK_CONFIRMED:-false}"
DEPLOYED_BY="${DEPLOYED_BY:-unknown}"
LOG_DIR="${LOG_DIR:-${APP_PATH}/logs}"

# Derived paths
RELEASES_DIR="${APP_PATH}/releases"
CURRENT_DIR="${APP_PATH}/current"

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

ROLLBACK_LOG="${LOG_DIR}/rollback-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# =============================================================================
# Helper Functions
# =============================================================================

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$ROLLBACK_LOG"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$ROLLBACK_LOG"
    exit 1
}

# =============================================================================
# Confirmation Gate
# =============================================================================

if [[ "$ROLLBACK_CONFIRMED" != "true" ]]; then
    echo -e "${RED}WARNING: This will rollback to ${ROLLBACK_TARGET}${NC}"
    echo "Set ROLLBACK_CONFIRMED=true to proceed"
    echo ""
    echo "To rollback, re-run with:"
    echo "  ROLLBACK_CONFIRMED=true bash deploy.sh rollback"
    exit 1
fi

# =============================================================================
# Pre-flight Checks
# =============================================================================

log "Starting rollback..."
log "Rollback target: ${ROLLBACK_TARGET}"
log "Initiated by: ${DEPLOYED_BY}"
log "APP_PATH: ${APP_PATH}"

[[ -d "$APP_PATH" ]] || error "APP_PATH does not exist: ${APP_PATH}"
[[ -d "$RELEASES_DIR" ]] || error "Releases directory does not exist: ${RELEASES_DIR}"

# =============================================================================
# Find Previous Release
# =============================================================================

log "Looking for release: ${ROLLBACK_TARGET}"

# Try git tag first
if git -C "$APP_PATH" rev-parse "${ROLLBACK_TARGET}" >/dev/null 2>&1; then
    log "Found git tag: ${ROLLBACK_TARGET}"
    PREV_RELEASE="$ROLLBACK_TARGET"
else
    # Try timestamped directory (newest directory matching or closest match)
    log "No git tag found, looking for timestamped release directory..."
    
    PREV_RELEASE=""
    
    # List release directories sorted by modification time (newest first)
    RELEASE_DIRS=$(find "$RELEASES_DIR" -maxdepth 1 -mindepth 1 -type d -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -10)
    
    if [[ -n "$RELEASE_DIRS" ]]; then
        # Try exact match first
        while IFS= read -r line; do
            DIR_PATH=$(echo "$line" | awk '{print $2}')
            DIR_NAME=$(basename "$DIR_PATH")
            if [[ "$DIR_NAME" == "$ROLLBACK_TARGET" ]]; then
                PREV_RELEASE="$DIR_PATH"
                break
            fi
        done <<< "$RELEASE_DIRS"
        
        # If no exact match, try partial match (newest match)
        if [[ -z "$PREV_RELEASE" ]]; then
            while IFS= read -r line; do
                DIR_PATH=$(echo "$line" | awk '{print $2}')
                DIR_NAME=$(basename "$DIR_PATH")
                if [[ "$DIR_NAME" == *"$ROLLBACK_TARGET"* ]]; then
                    PREV_RELEASE="$DIR_PATH"
                    break
                fi
            done <<< "$RELEASE_DIRS"
        fi
        
        # If still no match, use the second newest directory
        if [[ -z "$PREV_RELEASE" ]]; then
            PREV_RELEASE=$(echo "$RELEASE_DIRS" | head -2 | tail -1 | awk '{print $2}')
            if [[ -z "$PREV_RELEASE" ]]; then
                PREV_RELEASE=$(echo "$RELEASE_DIRS" | head -1 | awk '{print $2}')
            fi
            warn "No exact match found, using: $(basename "$PREV_RELEASE")"
        fi
    fi
fi

if [[ -z "$PREV_RELEASE" ]]; then
    error "Could not find release matching '${ROLLBACK_TARGET}' — available releases: $(ls -1t "$RELEASES_DIR" | head -5 | tr '\n' ' ')"
fi

log "Rolling back to: ${PREV_RELEASE}"

# =============================================================================
# Verify Previous Release Exists
# =============================================================================

# If it's a git commit, we need to checkout
if git -C "$APP_PATH" rev-parse "${PREV_RELEASE}" >/dev/null 2>&1; then
    log "Rolling back git repository to: ${PREV_RELEASE}"
    cd "$APP_PATH"
    git checkout "${PREV_RELEASE}" 2>&1 | tee -a "$ROLLBACK_LOG"
    git pull origin main 2>&1 | tee -a "$ROLLBACK_LOG"
else
    # It's a directory path
    [[ -d "$PREV_RELEASE" ]] || error "Release directory does not exist: ${PREV_RELEASE}"
fi

# =============================================================================
# Server Rollback
# =============================================================================

log "Rolling back server..."

# Install dependencies
cd "${APP_PATH}/server"
if ! npm ci --production 2>&1 | tee -a "$ROLLBACK_LOG"; then
    error "npm ci failed during rollback — server dependencies may be corrupted"
fi

log "Server dependencies installed"

# =============================================================================
# Frontend Rollback (if directory-based)
# =============================================================================

if [[ -d "$PREV_RELEASE" ]]; then
    log "Rolling back frontend..."
    
    CLIENT_DIR="${APP_PATH:-/var/www/Online-Corporate-Travel-Desk-}/client"
    ADMIN_DIR="${APP_PATH:-/var/www/Online-Corporate-Travel-Desk-}/super-admin"
    
    # Backup current before rollback
    if [[ -d "$CLIENT_DIR" ]]; then
        BACKUP_NAME="client-pre-rollback-$(date +%Y%m%d-%H%M%S)"
        cp -a "$CLIENT_DIR" "/tmp/${BACKUP_NAME}" 2>/dev/null || true
    fi
    
    if [[ -d "$ADMIN_DIR" ]]; then
        BACKUP_NAME="admin-pre-rollback-$(date +%Y%m%d-%H%M%S)"
        cp -a "$ADMIN_DIR" "/tmp/${BACKUP_NAME}" 2>/dev/null || true
    fi
    
    # Deploy from previous release
    if [[ -d "${PREV_RELEASE}/dist" ]]; then
        cp -a "${PREV_RELEASE}/dist/." "$CLIENT_DIR/" 2>/dev/null || warn "Could not restore client files"
        cp -a "${PREV_RELEASE}/dist/." "$ADMIN_DIR/" 2>/dev/null || warn "Could not restore admin files"
    fi
    
    log "Frontend rolled back"
fi

# =============================================================================
# PM2 Restart
# =============================================================================

log "Restarting PM2 processes..."

# Copy ecosystem config
if [[ -d "$PREV_RELEASE" && -f "${PREV_RELEASE}/server/ecosystem.config.js" ]]; then
    cp "${PREV_RELEASE}/server/ecosystem.config.js" "${APP_PATH}/server/ecosystem.config.js"
fi

# Stop existing processes
pm2 delete travel-api 2>/dev/null || true

# Start with ecosystem config
cd "${APP_PATH}/server"
if ! pm2 start ecosystem.config.js 2>&1 | tee -a "$ROLLBACK_LOG"; then
    error "PM2 start failed during rollback — check ecosystem.config.js and server logs"
fi

pm2 save 2>&1 | tee -a "$ROLLBACK_LOG"

log "PM2 processes restarted"

# =============================================================================
# Health Verification
# =============================================================================

log "Waiting for application to start..."
sleep 5

# Check if process is running
if ! pm2 list 2>&1 | tee -a "$ROLLBACK_LOG" | grep -q "travel-api.*online"; then
    warn "PM2 process travel-api is not online after rollback — dumping PM2 status:"
    pm2 list 2>&1 | tee -a "$ROLLBACK_LOG"
    error "PM2 process travel-api failed to start after rollback — rollback may have failed — check ${LOG_DIR}/error.log"
fi

log "PM2 process travel-api is online"

# Quick HTTP check
for i in 1 2 3; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log "Health check passed (HTTP ${HTTP_CODE})"
        break
    fi
    if [ "$i" -eq 3 ]; then
        warn "Health check failed after rollback — last HTTP response: ${HTTP_CODE} — rollback may need manual intervention"
    fi
    warn "Health check attempt $i failed (HTTP ${HTTP_CODE}), retrying in 5s..."
    sleep 5
done

# =============================================================================
# Log Summary
# =============================================================================

log "=========================================="
log "Rollback Complete"
log "=========================================="
log "Rolled back to: ${PREV_RELEASE}"
log "Rolled back by: ${DEPLOYED_BY}"
log "Rollback log: ${ROLLBACK_LOG}"
log "=========================================="
