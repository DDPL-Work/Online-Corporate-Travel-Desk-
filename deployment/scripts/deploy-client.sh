#!/bin/bash
set -euo pipefail

# =============================================================================
# Deploy Client Script
# Called via SSH from GitHub Actions
# Expects: /tmp/client-dist.tar.gz as first argument
# =============================================================================

TARBALL="${1:?Usage: deploy-client.sh <path-to-tarball>}"
APP_PATH="${APP_PATH:?APP_PATH is required}"
COMMIT_HASH="${COMMIT_HASH:-}"
CLIENT_DIR="${APP_PATH}/current/client"
NGINX_HTML="/var/www/html"
LOG_DIR="${APP_PATH}/logs"
DEPLOY_LOG="${LOG_DIR}/deploy-client-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOY_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$DEPLOY_LOG"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$DEPLOY_LOG"
    exit 1
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

log "Starting client deployment..."
log "Tarball: ${TARBALL}"
log "App path: ${APP_PATH}"

if [ ! -f "$TARBALL" ]; then
    error "Tarball not found: ${TARBALL}"
fi

# Create required directories
mkdir -p "$LOG_DIR" "$CLIENT_DIR" "$NGINX_HTML" 2>/dev/null || true

# =============================================================================
# Extract and Deploy
# =============================================================================

log "Extracting client build..."
cd /tmp

# Extract tarball
if ! tar -xzf "$TARBALL" 2>&1 | tee -a "$DEPLOY_LOG"; then
    error "Failed to extract tarball"
fi

# Backup current client (if exists)
if [ -d "$CLIENT_DIR/dist" ]; then
    BACKUP_DIR="${APP_PATH}/backups/client-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR" 2>/dev/null || true
    cp -r "$CLIENT_DIR/dist" "$BACKUP_DIR" 2>/dev/null || true
    log "Backed up current client to ${BACKUP_DIR}"
fi

# Deploy to client directory
log "Deploying to ${CLIENT_DIR}..."
if ! rm -rf "${CLIENT_DIR}/dist" 2>&1 | tee -a "$DEPLOY_LOG"; then
    warn "Failed to remove old dist, continuing..."
fi

if ! cp -r /tmp/dist "${CLIENT_DIR}/dist" 2>&1 | tee -a "$DEPLOY_LOG"; then
    error "Failed to copy dist files"
fi

# Deploy to nginx html directory
log "Deploying to nginx html directory..."
if ! rm -rf "${NGINX_HTML:?}"/* 2>&1 | tee -a "$DEPLOY_LOG"; then
    warn "Failed to clean nginx html, continuing..."
fi

if ! cp -r "${CLIENT_DIR}/dist/"* "${NGINX_HTML}/" 2>&1 | tee -a "$DEPLOY_LOG"; then
    error "Failed to copy to nginx html directory"
fi

# Set permissions
chmod -R 755 "$NGINX_HTML" 2>/dev/null || true

# =============================================================================
# Cleanup
# =============================================================================

log "Cleaning up temporary files..."
rm -rf /tmp/dist /tmp/client-dist.tar.gz 2>/dev/null || true

# =============================================================================
# Verification
# =============================================================================

log "Verifying deployment..."

if [ ! -f "${NGINX_HTML}/index.html" ]; then
    error "index.html not found in ${NGINX_HTML}"
fi

log "Client deployment completed successfully!"
log "Deploy log: ${DEPLOY_LOG}"
