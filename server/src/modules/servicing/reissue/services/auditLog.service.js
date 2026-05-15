/**
 * Audit Logging Service for Reissue Operations
 * 
 * Tracks all sensitive operations for compliance, debugging, and security.
 * Logs include: actor role, actor ID, action, resource ID, status changes, timestamps.
 */

const mongoose = require("mongoose");
const logger = require("../../../utils/logger");

/**
 * Log reissue audit events
 * Stores comprehensive audit trail for all operations
 * 
 * @param {Object} auditData - Audit information
 * @param {string} auditData.actor - Actor information (ID, role, email)
 * @param {string} auditData.action - Action type (from AUDIT_ACTIONS)
 * @param {string} auditData.requestId - Reissue request ID
 * @param {string} auditData.module - Module (offline_reissue, online_reissue)
 * @param {Object} auditData.previousState - Previous object state (for updates)
 * @param {Object} auditData.newState - New object state (for updates)
 * @param {string} auditData.details - Additional context/details
 * @param {string} auditData.ipAddress - Client IP address
 * @param {string} auditData.userAgent - Client user agent
 * @returns {Promise<void>}
 */
async function logAuditEvent(auditData) {
  try {
    const {
      actor,
      action,
      requestId,
      module = "reissue",
      previousState,
      newState,
      details,
      ipAddress,
      userAgent,
    } = auditData;

    // Validate required fields
    if (!actor || !action || !requestId) {
      logger.warn("Incomplete audit data", { auditData });
      return;
    }

    // Structure audit entry
    const auditEntry = {
      timestamp: new Date(),
      actor: {
        id: actor.id || actor._id,
        role: actor.role,
        email: actor.email,
        name: actor.name,
      },
      action,
      module,
      resource: {
        type: "reissue_request",
        id: requestId,
      },
      changes: {
        previous: previousState || null,
        current: newState || null,
      },
      metadata: {
        ipAddress,
        userAgent,
        details,
      },
    };

    // Try to use AuditLog model if available
    try {
      const AuditLog = require("../models/AuditLog.model");
      await AuditLog.create(auditEntry);
    } catch (modelError) {
      // If model not found, just log to file/console
      logger.info("Reissue audit event", auditEntry);
    }
  } catch (error) {
    logger.error("Failed to log audit event", {
      error: error.message,
      auditData,
    });
    // Don't throw - audit failure shouldn't block operations
  }
}

/**
 * Helper: Log admin list access
 */
async function logAdminListAccess(actor, ipAddress, userAgent) {
  await logAuditEvent({
    actor,
    action: "OFFLINE_LIST_ACCESSED",
    requestId: "LIST_VIEW",
    module: "offline_reissue",
    details: "Admin viewed list of offline reissue requests",
    ipAddress,
    userAgent,
  });
}

/**
 * Helper: Log request view
 */
async function logRequestViewed(actor, requestId, ipAddress, userAgent) {
  await logAuditEvent({
    actor,
    action: "OFFLINE_REQUEST_VIEWED",
    requestId,
    module: "offline_reissue",
    details: "Offline reissue request viewed",
    ipAddress,
    userAgent,
  });
}

/**
 * Helper: Log status update
 */
async function logStatusUpdate(
  actor,
  requestId,
  previousStatus,
  newStatus,
  message,
  ipAddress,
  userAgent,
) {
  await logAuditEvent({
    actor,
    action: "OFFLINE_STATUS_UPDATED",
    requestId,
    module: "offline_reissue",
    previousState: { status: previousStatus },
    newState: { status: newStatus },
    details: message || null,
    ipAddress,
    userAgent,
  });
}

/**
 * Helper: Log ticket generation
 */
async function logTicketGenerated(actor, requestId, fileName, ipAddress, userAgent) {
  await logAuditEvent({
    actor,
    action: "OFFLINE_TICKET_GENERATED",
    requestId,
    module: "offline_reissue",
    details: `Reissued ticket generated: ${fileName}`,
    ipAddress,
    userAgent,
  });
}

/**
 * Helper: Log invoice upload
 */
async function logInvoiceUpload(actor, requestId, fileName, ipAddress, userAgent) {
  await logAuditEvent({
    actor,
    action: "OFFLINE_INVOICE_UPLOADED",
    requestId,
    module: "offline_reissue",
    details: `Invoice uploaded: ${fileName}`,
    ipAddress,
    userAgent,
  });
}

/**
 * Helper: Log request rejection
 */
async function logRequestRejection(
  actor,
  requestId,
  reason,
  ipAddress,
  userAgent,
) {
  await logAuditEvent({
    actor,
    action: "OFFLINE_REQUEST_REJECTED",
    requestId,
    module: "offline_reissue",
    details: `Request rejected: ${reason}`,
    ipAddress,
    userAgent,
  });
}

/**
 * Helper: Log request completion
 */
async function logRequestCompletion(actor, requestId, ipAddress, userAgent) {
  await logAuditEvent({
    actor,
    action: "OFFLINE_REQUEST_COMPLETED",
    requestId,
    module: "offline_reissue",
    details: "Offline reissue request completed",
    ipAddress,
    userAgent,
  });
}

/**
 * Helper: Log ticket download
 */
async function logTicketDownload(actor, requestId, ipAddress, userAgent) {
  await logAuditEvent({
    actor,
    action: "OFFLINE_TICKET_DOWNLOADED",
    requestId,
    module: "offline_reissue",
    details: "Revised ticket downloaded",
    ipAddress,
    userAgent,
  });
}

/**
 * Helper: Log invoice download
 */
async function logInvoiceDownload(actor, requestId, ipAddress, userAgent) {
  await logAuditEvent({
    actor,
    action: "OFFLINE_INVOICE_DOWNLOADED",
    requestId,
    module: "offline_reissue",
    details: "Invoice downloaded",
    ipAddress,
    userAgent,
  });
}

/**
 * Extract IP address from request
 */
function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    "unknown"
  );
}

module.exports = {
  logAuditEvent,
  logAdminListAccess,
  logRequestViewed,
  logStatusUpdate,
  logTicketUpload: logTicketGenerated,
  logTicketGenerated,
  logInvoiceUpload,
  logRequestRejection,
  logRequestCompletion,
  logTicketDownload,
  logInvoiceDownload,
  getClientIp,
};
