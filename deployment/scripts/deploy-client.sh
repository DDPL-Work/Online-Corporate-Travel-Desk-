#!/bin/bash
set -euo pipefail

# =============================================================================
# Deploy Client Script
# Deploys the client/frontend build artifact to nginx
# =============================================================================

# Environment variables passed from GitHub Actions
ARTIFACT_NAME="${ARTIFACT_NAME:?ARTIFACT_NAME is required}"
ARTIFACT_PATH="${ARTIFACT_PATH:?ARTIFACT_PATH is required}"
CLIENT_DIR="${CLIENT_DIR:?CLIENT_DIR is required}"
NGINX_HTML="${NGINX_HTML:-/var/www/html}"
LOG_DIR="${LOG_DIR:-/var/log/travel-app}"

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

DEPLOY_LOG="${LOG_DIR}/deploy-client-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# =============================================================================
# Helper Functions
# =============================================================================

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
log "Artifact: ${ARTIFACT_NAME}"
log "Artifact path: ${ARTIFACT_PATH}"

# Validate artifact exists
[[ -f "${ARTIFACT_PATH}" ]] || error "Artifact not found: ${ARTIFACT_PATH} — ensure the build step produced a tarball"

# Validate artifact is not empty
[[ -s "${ARTIFACT_PATH}" ]] || error "Artifact is empty (0 bytes): ${ARTIFACT_PATH} — the build step may have failed silently"

# Validate artifact is a tarball
if ! file "${ARTIFACT_PATH}" | grep -q "gzip\|tar"; then
    warn "Artifact may not be a valid tarball — file type: $(file "${ARTIFACT_PATH}")"
fi

# =============================================================================
# Backup Current Deployment
# =============================================================================

if [[ -d "${CLIENT_DIR}" ]]; then
    log "Backing up current client deployment..."
    BACKUP_NAME="client-backup-$(date +%Y%m%d-%H%M%S)"
    cp -a "${CLIENT_DIR}" "/tmp/${BACKUP_NAME}" 2>/dev/null || true
    log "Backup created: /tmp/${BACKUP_NAME}"
else
    warn "No existing client deployment found at ${CLIENT_DIR} — first deploy"
fi

# =============================================================================
# Extract and Deploy
# =============================================================================

log "Extracting artifact..."
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

if ! tar -xzf "${ARTIFACT_PATH}" -C "${TEMP_DIR}" 2>&1 | tee -a "$DEPLOY_LOG"; then
    error "Failed to extract artifact ${ARTIFACT_PATH} — file may be corrupted or not a valid tar.gz"
fi

# Verify extraction produced output
if [[ -z "$(ls -A "${TEMP_DIR}" 2>/dev/null)" ]]; then
    error "Extraction produced empty directory — artifact ${ARTIFACT_PATH} may be empty or corrupt"
fi

# Look for dist/ directory in extracted content
if [[ -d "${TEMP_DIR}/dist" ]]; then
    EXTRACTED_DIR="${TEMP_DIR}/dist"
elif [[ -d "${TEMP_DIR}/client/dist" ]]; then
    EXTRACTED_DIR="${TEMP_DIR}/client/dist"
else
    warn "No dist/ directory found in extracted artifact — using root extraction directory"
    EXTRACTED_DIR="${TEMP_DIR}"
fi

# Validate dist directory has expected files
if [[ -f "${EXTRACTED_DIR}/index.html" ]]; then
    log "Verified dist/index.html exists — build appears valid"
else
    warn "dist/index.html not found — build may be incomplete"
fi

log "Deploying to ${CLIENT_DIR}..."

# Create target directory
mkdir -p "${CLIENT_DIR}" || error "Unable to create client directory: ${CLIENT_DIR} — check disk space and permissions"

# Copy extracted files
if ! cp -a "${EXTRACTED_DIR}/." "${CLIENT_DIR}/" 2>&1 | tee -a "$DEPLOY_LOG"; then
    error "Failed to copy build files to ${CLIENT_DIR} — check disk space and permissions"
fi

# Verify files were copied
FILE_COUNT=$(find "${CLIENT_DIR}" -type f | wc -l)
if [[ "$FILE_COUNT" -lt 1 ]]; then
    error "No files were copied to ${CLIENT_DIR} — deployment failed"
fi

log "Deployed ${FILE_COUNT} files to ${CLIENT_DIR}"

# =============================================================================
# Nginx Deployment (if nginx path is different from client dir)
# =============================================================================

if [[ "${NGINX_HTML}" != "${CLIENT_DIR}" ]]; then
    log "Deploying to nginx directory: ${NGINX_HTML}..."
    mkdir -p "${NGINX_HTML}" || error "Unable to create nginx directory: ${NGINX_HTML}"
    if ! cp -a "${CLIENT_DIR}/." "${NGINX_HTML}/" 2>&1 | tee -a "$DEPLOY_LOG"; then
        error "Failed to deploy to nginx directory: ${NGINX_HTML}"
    fi
fi

# =============================================================================
# Verify Deployment
# =============================================================================

log "Verifying deployment..."

if [[ -f "${NGINX_HTML}/index.html" ]]; then
    log "Verified nginx directory has index.html"
else
    error "index.html not found in nginx directory ${NGINX_HTML} — deployment may have failed"
fi

# =============================================================================
# Cleanup
# =============================================================================

log "Cleaning up old backups..."
ls -1t /tmp/client-backup-* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true

# Remove old deploy logs (keep last 10)
ls -1t "${LOG_DIR}"/deploy-client-*.log 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

log "Client deployment completed successfully!"
log "Deploy log: ${DEPLOY_LOG}"
