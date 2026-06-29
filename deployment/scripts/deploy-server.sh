#!/bin/bash
set -euo pipefail

# =============================================================================
# Deploy Server Script
# Called via SSH from GitHub Actions
# =============================================================================

# Environment variables passed from GitHub Actions
APP_PATH="${APP_PATH:?APP_PATH is required}"
COMMIT_HASH="${COMMIT_HASH:-}"
NODE_ENV="${NODE_ENV:-production}"
DEPLOYED_BY="${DEPLOYED_BY:-unknown}"

# Derived paths
RELEASES_DIR="${APP_PATH}/releases"
CURRENT_DIR="${APP_PATH}/current"
SHARED_DIR="${APP_PATH}/shared"
LOG_DIR="${APP_PATH}/logs"

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

DEPLOY_LOG="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"

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

log "Starting deployment..."
log "App path: ${APP_PATH}"
log "Commit: ${COMMIT_HASH}"
log "Deployed by: ${DEPLOYED_BY}"
log "Node environment: ${NODE_ENV}"

# Validate APP_PATH exists
[[ -d "$APP_PATH" ]] || error "APP_PATH does not exist: ${APP_PATH}"

# Create required directories (fail if critical dirs cannot be created)
mkdir -p "$RELEASES_DIR" || error "Unable to create releases directory: ${RELEASES_DIR}"
mkdir -p "$SHARED_DIR" || error "Unable to create shared directory: ${SHARED_DIR}"

# Verify we're in the right directory
[[ -d "$APP_PATH/.git" ]] || error "Git repository not found at ${APP_PATH} — expected .git directory"

# Test write permissions on releases directory
touch "${RELEASES_DIR}/.permission_test" 2>/dev/null || error "Cannot write to ${RELEASES_DIR} — check permissions for user $(whoami)"
rm -f "${RELEASES_DIR}/.permission_test"

# =============================================================================
# Git Operations
# =============================================================================

log "Pulling latest changes..."
cd "$APP_PATH"

# Fetch all changes
if ! git fetch --all --prune 2>&1 | tee -a "$DEPLOY_LOG"; then
    error "Git fetch failed — check network connectivity and repository access"
fi

# Reset to the specified commit or latest main
if [ -n "$COMMIT_HASH" ]; then
    log "Checking out commit: ${COMMIT_HASH}"
    if ! git checkout "$COMMIT_HASH" 2>&1 | tee -a "$DEPLOY_LOG"; then
        error "Git checkout failed for commit ${COMMIT_HASH} — commit may not exist in repository"
    fi
else
    log "Checking out main branch..."
    if ! git checkout main 2>&1 | tee -a "$DEPLOY_LOG"; then
        error "Git checkout main failed — branch may not exist"
    fi
fi

# Pull latest changes
if ! git pull origin main 2>&1 | tee -a "$DEPLOY_LOG"; then
    error "Git pull failed — possible merge conflict or network issue"
fi

log "Current commit: $(git rev-parse HEAD)"

# =============================================================================
# Server Dependencies
# =============================================================================

log "Installing server dependencies..."
cd "${APP_PATH}/server"

# Verify package.json exists
[[ -f "${APP_PATH}/server/package.json" ]] || error "package.json not found in ${APP_PATH}/server"

# Clean install
if ! rm -rf node_modules 2>&1 | tee -a "$DEPLOY_LOG"; then
    warn "Failed to remove node_modules, continuing with fresh install..."
fi

if ! npm ci --production 2>&1 | tee -a "$DEPLOY_LOG"; then
    error "npm ci failed for server — check package.json and package-lock.json for errors"
fi

log "Server dependencies installed successfully"

# =============================================================================
# PM2 Restart
# =============================================================================

log "Restarting PM2 processes..."

# Copy ecosystem config
if [ -f "${APP_PATH}/deployment/pm2/ecosystem.config.js" ]; then
    cp "${APP_PATH}/deployment/pm2/ecosystem.config.js" "${APP_PATH}/server/ecosystem.config.js"
    log "Copied ecosystem.config.js from deployment/pm2/"
else
    warn "deployment/pm2/ecosystem.config.js not found, using inline config"
    cat > "${APP_PATH}/server/ecosystem.config.js" << 'ECOSYSTEM'
module.exports = {
  apps: [
    {
      name: "travel-api",
      cwd: "/var/www/Online-Corporate-Travel-Desk-/server",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "/var/www/Online-Corporate-Travel-Desk-/logs/error.log",
      out_file: "/var/www/Online-Corporate-Travel-Desk-/logs/output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
ECOSYSTEM
fi

# Stop existing processes
pm2 delete travel-api 2>/dev/null || true

# Start with ecosystem config
cd "${APP_PATH}/server"
if ! pm2 start ecosystem.config.js 2>&1 | tee -a "$DEPLOY_LOG"; then
    error "PM2 start failed — check ecosystem.config.js and server logs in ${LOG_DIR}"
fi

# Save PM2 process list
pm2 save 2>&1 | tee -a "$DEPLOY_LOG"

log "PM2 processes restarted successfully"

# =============================================================================
# Health Verification
# =============================================================================

log "Waiting for application to start..."
sleep 5

# Check if process is running
if ! pm2 list 2>&1 | tee -a "$DEPLOY_LOG" | grep -q "travel-api.*online"; then
    warn "PM2 process travel-api is not online — dumping PM2 status for diagnostics:"
    pm2 list 2>&1 | tee -a "$DEPLOY_LOG"
    error "PM2 process travel-api failed to start — check ${LOG_DIR}/error.log and ${LOG_DIR}/output.log"
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
        error "Health check failed after 3 attempts — last HTTP response: ${HTTP_CODE} — API may not be responding on port 5000"
    fi
    warn "Health check attempt $i failed (HTTP ${HTTP_CODE}), retrying in 5s..."
    sleep 5
done

# =============================================================================
# Cleanup Old Releases
# =============================================================================

log "Cleaning up old releases..."
cd "$RELEASES_DIR"
ls -1t | tail -n +6 | xargs rm -rf 2>/dev/null || true

log "Deployment completed successfully!"
log "Deploy log: ${DEPLOY_LOG}"
