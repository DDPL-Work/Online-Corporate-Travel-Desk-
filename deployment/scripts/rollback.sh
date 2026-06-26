#!/bin/bash
set -euo pipefail

# =============================================================================
# Rollback Script
# Rolls back to the previous or a specific release
# =============================================================================

APP_PATH="${APP_PATH:?APP_PATH is required}"
ROLLBACK_CONFIRMED="${ROLLBACK_CONFIRMED:-false}"
ROLLBACK_TARGET="${1:-}"
AUTO_MODE=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --auto) AUTO_MODE=true ;;
        --target) shift; ROLLBACK_TARGET="${1:-}" ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"; exit 1; }

# =============================================================================
# Confirmation
# =============================================================================

if [ "$ROLLBACK_CONFIRMED" != "true" ] && [ "$AUTO_MODE" != "true" ]; then
    echo "This will rollback the deployment on this server."
    echo "Set ROLLBACK_CONFIRMED=true or use --auto to proceed."
    exit 1
fi

# =============================================================================
# Find Previous Release
# =============================================================================

RELEASES_DIR="${APP_PATH}/releases"
CURRENT_LINK="${APP_PATH}/current"

if [ ! -d "$RELEASES_DIR" ]; then
    error "No releases directory found at ${RELEASES_DIR}"
fi

# Get current release
CURRENT_TARGET=$(readlink -f "$CURRENT_LINK" 2>/dev/null || echo "")
log "Current release: ${CURRENT_TARGET}"

# List available releases sorted by modification time (newest first)
mapfile -t RELEASES < <(ls -1dt "${RELEASES_DIR}"/*/  2>/dev/null)

if [ ${#RELEASES[@]} -lt 2 ]; then
    error "Not enough releases to rollback (found ${#RELEASES[@]})"
fi

# Find the previous release (skip current)
PREVIOUS_RELEASE=""
for release in "${RELEASES[@]}"; do
    TRIMMED="${release%/}"
    if [ "$TRIMMED" != "$CURRENT_TARGET" ]; then
        PREVIOUS_RELEASE="$TRIMMED"
        break
    fi
done

if [ -z "$PREVIOUS_RELEASE" ]; then
    error "Could not determine previous release"
fi

log "Previous release: ${PREVIOUS_RELEASE}"

# =============================================================================
# Execute Rollback
# =============================================================================

log "Rolling back to: ${PREVIOUS_RELEASE}"

# Update symlink
if [ -L "$CURRENT_LINK" ]; then
    rm "$CURRENT_LINK"
fi
ln -s "$PREVIOUS_RELEASE" "$CURRENT_LINK"
log "Updated current symlink -> ${PREVIOUS_RELEASE}"

# Copy ecosystem config if it exists
if [ -f "${PREVIOUS_RELEASE}/deployment/pm2/ecosystem.config.js" ]; then
    cp "${PREVIOUS_RELEASE}/deployment/pm2/ecosystem.config.js" "${PREVIOUS_RELEASE}/server/ecosystem.config.js"
fi

# Install dependencies if needed
if [ ! -d "${PREVIOUS_RELEASE}/server/node_modules" ]; then
    log "Installing server dependencies..."
    cd "${PREVIOUS_RELEASE}/server"
    npm ci --production 2>&1 || warn "npm ci failed, continuing with existing node_modules"
fi

# Restart PM2
log "Restarting PM2..."
cd "${PREVIOUS_RELEASE}/server"
pm2 delete travel-api 2>/dev/null || true
pm2 start ecosystem.config.js 2>&1 || error "PM2 start failed"
pm2 save 2>&1

# Health check
log "Waiting for application to start..."
sleep 5

for i in 1 2 3; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log "Health check passed (HTTP ${HTTP_CODE})"
        break
    fi
    if [ "$i" -eq 3 ]; then
        error "Health check failed after 3 attempts (last HTTP: ${HTTP_CODE})"
    fi
    warn "Health check attempt $i failed, retrying in 5s..."
    sleep 5
done

log "Rollback completed successfully!"
