/**
 * Centralized RBAC for Offline & Online Reissue Management
 * 
 * This file defines all role hierarchies and permission matrices
 * for the reissue module. Use these constants instead of hard-coded
 * role strings in middleware and route handlers.
 */

// ════════════════════════════════════════════════════════════════
// ROLE DEFINITIONS
// ════════════════════════════════════════════════════════════════

const ROLES = Object.freeze({
  SUPER_ADMIN: "super-admin",
  MASTER_ADMIN: "master-admin",
  OPS_ADMIN: "ops-admin",
  OPS_AGENT: "ops-member",
  TRAVEL_ADMIN: "travel-admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
});

// ════════════════════════════════════════════════════════════════
// PERMISSION DEFINITIONS
// ════════════════════════════════════════════════════════════════

const PERMISSIONS = Object.freeze({
  // Admin & Management
  ADMIN_LIST_REQUESTS: "admin:list_requests",
  ADMIN_VIEW_REQUEST: "admin:view_request",
  ADMIN_ASSIGN_AGENT: "admin:assign_agent",
  ADMIN_UPDATE_STATUS: "admin:update_status",
  ADMIN_UPLOAD_TICKET: "admin:upload_ticket",
  ADMIN_UPLOAD_INVOICE: "admin:upload_invoice",
  ADMIN_REJECT_REQUEST: "admin:reject_request",
  ADMIN_COMPLETE_REQUEST: "admin:complete_request",
  ADMIN_VIEW_ANALYTICS: "admin:view_analytics",
  ADMIN_VIEW_SLA_METRICS: "admin:view_sla_metrics",
  ADMIN_VIEW_AUDIT_LOGS: "admin:view_audit_logs",

  // Ops Operations
  OPS_PROCESS_ASSIGNED: "ops:process_assigned",
  OPS_UPDATE_STATUS: "ops:update_status",
  OPS_UPLOAD_TICKET: "ops:upload_ticket",
  OPS_UPLOAD_INVOICE: "ops:upload_invoice",
  OPS_MANAGE_REISSUES: "ops:manage_reissues",

  // Employee/Passenger
  EMPLOYEE_CREATE_REQUEST: "employee:create_request",
  EMPLOYEE_VIEW_OWN: "employee:view_own",
  EMPLOYEE_DOWNLOAD_OWN_TICKET: "employee:download_own_ticket",
  EMPLOYEE_VIEW_STATUS_TIMELINE: "employee:view_status_timeline",
});

// ════════════════════════════════════════════════════════════════
// OFFLINE REISSUE ACCESS ROLES
// ════════════════════════════════════════════════════════════════

const OFFLINE_REISSUE_ADMIN_ROLES = Object.freeze([
  ROLES.SUPER_ADMIN,
  ROLES.MASTER_ADMIN,
  ROLES.OPS_ADMIN,
]);

const OFFLINE_REISSUE_OPS_ROLES = Object.freeze([
  ROLES.OPS_ADMIN,
  ROLES.OPS_AGENT,
]);

const OFFLINE_REISSUE_EMPLOYEE_ROLES = Object.freeze([
  ROLES.EMPLOYEE,
  ROLES.MANAGER,
  ROLES.TRAVEL_ADMIN,
]);

const OFFLINE_REISSUE_ALL_ROLES = Object.freeze([
  ...OFFLINE_REISSUE_ADMIN_ROLES,
  ...OFFLINE_REISSUE_OPS_ROLES,
  ...OFFLINE_REISSUE_EMPLOYEE_ROLES,
]);

// ════════════════════════════════════════════════════════════════
// ONLINE REISSUE ACCESS ROLES
// ════════════════════════════════════════════════════════════════

const ONLINE_REISSUE_ADMIN_ROLES = Object.freeze([
  ROLES.SUPER_ADMIN,
  ROLES.MASTER_ADMIN,
]);

const ONLINE_REISSUE_OPS_ROLES = Object.freeze([
  ROLES.OPS_ADMIN,
  ROLES.OPS_AGENT,
]);

const ONLINE_REISSUE_EMPLOYEE_ROLES = Object.freeze([
  ROLES.EMPLOYEE,
  ROLES.MANAGER,
  ROLES.TRAVEL_ADMIN,
]);

// ════════════════════════════════════════════════════════════════
// PERMISSION MATRIX BY ROLE
// ════════════════════════════════════════════════════════════════

const PERMISSION_MATRIX = Object.freeze({
  [ROLES.SUPER_ADMIN]: [
    // Full access to everything
    PERMISSIONS.ADMIN_LIST_REQUESTS,
    PERMISSIONS.ADMIN_VIEW_REQUEST,
    PERMISSIONS.ADMIN_ASSIGN_AGENT,
    PERMISSIONS.ADMIN_UPDATE_STATUS,
    PERMISSIONS.ADMIN_UPLOAD_TICKET,
    PERMISSIONS.ADMIN_UPLOAD_INVOICE,
    PERMISSIONS.ADMIN_REJECT_REQUEST,
    PERMISSIONS.ADMIN_COMPLETE_REQUEST,
    PERMISSIONS.ADMIN_VIEW_ANALYTICS,
    PERMISSIONS.ADMIN_VIEW_SLA_METRICS,
    PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS,
    // Employee permissions too
    PERMISSIONS.EMPLOYEE_CREATE_REQUEST,
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.EMPLOYEE_DOWNLOAD_OWN_TICKET,
    PERMISSIONS.EMPLOYEE_VIEW_STATUS_TIMELINE,
  ],

  [ROLES.MASTER_ADMIN]: [
    // Same as Super Admin
    PERMISSIONS.ADMIN_LIST_REQUESTS,
    PERMISSIONS.ADMIN_VIEW_REQUEST,
    PERMISSIONS.ADMIN_ASSIGN_AGENT,
    PERMISSIONS.ADMIN_UPDATE_STATUS,
    PERMISSIONS.ADMIN_UPLOAD_TICKET,
    PERMISSIONS.ADMIN_UPLOAD_INVOICE,
    PERMISSIONS.ADMIN_REJECT_REQUEST,
    PERMISSIONS.ADMIN_COMPLETE_REQUEST,
    PERMISSIONS.ADMIN_VIEW_ANALYTICS,
    PERMISSIONS.ADMIN_VIEW_SLA_METRICS,
    PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS,
    // Employee permissions too
    PERMISSIONS.EMPLOYEE_CREATE_REQUEST,
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.EMPLOYEE_DOWNLOAD_OWN_TICKET,
    PERMISSIONS.EMPLOYEE_VIEW_STATUS_TIMELINE,
  ],

  [ROLES.OPS_ADMIN]: [
    // Full ops access
    PERMISSIONS.ADMIN_LIST_REQUESTS,
    PERMISSIONS.ADMIN_VIEW_REQUEST,
    PERMISSIONS.ADMIN_ASSIGN_AGENT,
    PERMISSIONS.ADMIN_UPDATE_STATUS,
    PERMISSIONS.ADMIN_UPLOAD_TICKET,
    PERMISSIONS.ADMIN_UPLOAD_INVOICE,
    // Cannot delete or modify audit
    PERMISSIONS.OPS_PROCESS_ASSIGNED,
    PERMISSIONS.OPS_UPDATE_STATUS,
    PERMISSIONS.OPS_UPLOAD_TICKET,
    PERMISSIONS.OPS_UPLOAD_INVOICE,
  ],

  [ROLES.OPS_AGENT]: [
    // Limited ops access - assigned requests only
    PERMISSIONS.OPS_PROCESS_ASSIGNED,
    PERMISSIONS.OPS_UPDATE_STATUS,
    PERMISSIONS.OPS_UPLOAD_TICKET,
    PERMISSIONS.OPS_UPLOAD_INVOICE,
    PERMISSIONS.OPS_MANAGE_REISSUES,
    PERMISSIONS.ADMIN_VIEW_REQUEST, // Can view but not list all
  ],

  [ROLES.TRAVEL_ADMIN]: [
    // Can create and manage own requests
    PERMISSIONS.EMPLOYEE_CREATE_REQUEST,
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.EMPLOYEE_DOWNLOAD_OWN_TICKET,
    PERMISSIONS.EMPLOYEE_VIEW_STATUS_TIMELINE,
    // Also some admin visibility
    PERMISSIONS.ADMIN_LIST_REQUESTS,
    PERMISSIONS.ADMIN_VIEW_REQUEST,
  ],

  [ROLES.MANAGER]: [
    // Can create and manage own requests
    PERMISSIONS.EMPLOYEE_CREATE_REQUEST,
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.EMPLOYEE_DOWNLOAD_OWN_TICKET,
    PERMISSIONS.EMPLOYEE_VIEW_STATUS_TIMELINE,
  ],

  [ROLES.EMPLOYEE]: [
    // Limited to own requests
    PERMISSIONS.EMPLOYEE_CREATE_REQUEST,
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.EMPLOYEE_DOWNLOAD_OWN_TICKET,
    PERMISSIONS.EMPLOYEE_VIEW_STATUS_TIMELINE,
  ],
});

// ════════════════════════════════════════════════════════════════
// AUDIT LOG ACTIONS
// ════════════════════════════════════════════════════════════════

const AUDIT_ACTIONS = Object.freeze({
  // Offline reissue actions
  OFFLINE_LIST_ACCESSED: "OFFLINE_LIST_ACCESSED",
  OFFLINE_REQUEST_VIEWED: "OFFLINE_REQUEST_VIEWED",
  OFFLINE_REQUEST_CREATED: "OFFLINE_REQUEST_CREATED",
  OFFLINE_REQUEST_ASSIGNED: "OFFLINE_REQUEST_ASSIGNED",
  OFFLINE_STATUS_UPDATED: "OFFLINE_STATUS_UPDATED",
  OFFLINE_TICKET_GENERATED: "OFFLINE_TICKET_GENERATED",
  OFFLINE_INVOICE_UPLOADED: "OFFLINE_INVOICE_UPLOADED",
  OFFLINE_REQUEST_REJECTED: "OFFLINE_REQUEST_REJECTED",
  OFFLINE_REQUEST_COMPLETED: "OFFLINE_REQUEST_COMPLETED",
  OFFLINE_TICKET_DOWNLOADED: "OFFLINE_TICKET_DOWNLOADED",
  OFFLINE_INVOICE_DOWNLOADED: "OFFLINE_INVOICE_DOWNLOADED",

  // Online reissue actions
  ONLINE_REQUEST_CREATED: "ONLINE_REQUEST_CREATED",
  ONLINE_REQUEST_CONFIRMED: "ONLINE_REQUEST_CONFIRMED",
  ONLINE_REQUEST_CANCELLED: "ONLINE_REQUEST_CANCELLED",
  ONLINE_TICKET_UPLOADED: "ONLINE_TICKET_UPLOADED",
});

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  const permissions = PERMISSION_MATRIX[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the given permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
function hasAnyPermission(role, permissions) {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Check if a role has all of the given permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
function hasAllPermissions(role, permissions) {
  return permissions.every((p) => hasPermission(role, p));
}

module.exports = {
  ROLES,
  PERMISSIONS,
  PERMISSION_MATRIX,
  AUDIT_ACTIONS,
  OFFLINE_REISSUE_ADMIN_ROLES,
  OFFLINE_REISSUE_OPS_ROLES,
  OFFLINE_REISSUE_EMPLOYEE_ROLES,
  OFFLINE_REISSUE_ALL_ROLES,
  ONLINE_REISSUE_ADMIN_ROLES,
  ONLINE_REISSUE_OPS_ROLES,
  ONLINE_REISSUE_EMPLOYEE_ROLES,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
};
