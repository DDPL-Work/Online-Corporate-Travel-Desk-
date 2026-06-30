# Reissue RBAC Authorization - Implementation Guide

## Overview

This document outlines the complete RBAC (Role-Based Access Control) authorization system for the **Offline Reissue Management** and **Online Reissue** modules.

The system has been refactored from hard-coded role checks into a centralized, scalable permission matrix that supports:

- ✅ Super Admin + Master Admin roles
- ✅ OPS Admin + OPS Agent roles
- ✅ Travel Admin, Manager, Employee roles
- ✅ Fine-grained permission control
- ✅ Comprehensive audit logging
- ✅ Secure file downloads

---

## Table of Contents

1. [Architecture](#architecture)
2. [Role Hierarchy](#role-hierarchy)
3. [Permission Matrix](#permission-matrix)
4. [API Endpoints](#api-endpoints)
5. [Implementation Details](#implementation-details)
6. [Usage Examples](#usage-examples)
7. [Migration Guide](#migration-guide)
8. [Testing](#testing)

---

## Architecture

### Files Created/Modified

```
server/src/modules/servicing/reissue/
├── constants/
│   ├── reissue.constants.js          [EXISTING]
│   └── reissuePermissions.constants.js [NEW] ⭐
├── middleware/
│   └── authorizeReissueAccess.middleware.js [NEW] ⭐
├── services/
│   └── auditLog.service.js           [NEW] ⭐
├── routes/
│   ├── reissue.offline.routes.js     [UPDATED] ✨
│   ├── reissue.admin.routes.js       [UPDATED] ✨
│   ├── reissue.ops.routes.js         [UPDATED] ✨
│   └── reissue.employee.routes.js    [UPDATED] ✨
└── tests/
    └── reissue.rbac.test.js          [NEW] ⭐
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   HTTP Request                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│          verifyToken Middleware                         │
│    (auth.middleware.js - attaches req.user)            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│     authorizeReissueAccess Middleware                   │
│  (authorizeReissueAccess.middleware.js)                 │
│  - Checks req.user.role against                         │
│    permission matrix                                    │
│  - Attaches req.userPermissions                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│           Route Handler / Controller                    │
│       - Processes request                              │
│       - Calls service methods                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│           Audit Log Service                             │
│  (auditLog.service.js)                                  │
│  - Logs action, actor, resource                         │
│  - Tracks state changes                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              HTTP Response                              │
└─────────────────────────────────────────────────────────┘
```

---

## Role Hierarchy

### User Roles

```
Super Admin (super-admin)
├─ View all requests
├─ Assign agents
├─ Update statuses
├─ Upload files
├─ View analytics
└─ View audit logs

Master Admin (master-admin) [NEW]
├─ Same as Super Admin
└─ Enterprise-level oversight

OPS Admin (ops-admin)
├─ List requests
├─ Update statuses
├─ Assign agents
├─ Upload files
└─ Process workflows

OPS Agent (ops-member)
├─ Update assigned requests
├─ Upload files
└─ Process workflow steps

Travel Admin (travel-admin)
├─ Create requests
├─ View own requests
├─ View all requests (list)
└─ Download files

Manager (manager)
├─ Create requests
├─ View own requests
└─ Download own files

Employee (employee)
├─ Create requests
├─ View own requests
└─ Download own files
```

### Role Groups

```javascript
// From reissuePermissions.constants.js

// Admin roles with full access
OFFLINE_REISSUE_ADMIN_ROLES = [
  "super-admin",
  "master-admin",
  "ops-admin"
]

// OPS operational roles
OFFLINE_REISSUE_OPS_ROLES = [
  "ops-admin",
  "ops-member"
]

// Employee and related roles
OFFLINE_REISSUE_EMPLOYEE_ROLES = [
  "employee",
  "manager",
  "travel-admin"
]
```

---

## Permission Matrix

### Detailed Permission Breakdown

```javascript
// From reissuePermissions.constants.js

PERMISSIONS = {
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

  // Employee/Passenger
  EMPLOYEE_CREATE_REQUEST: "employee:create_request",
  EMPLOYEE_VIEW_OWN: "employee:view_own",
  EMPLOYEE_DOWNLOAD_OWN_TICKET: "employee:download_own_ticket",
  EMPLOYEE_VIEW_STATUS_TIMELINE: "employee:view_status_timeline"
}
```

### Access Matrix by Endpoint

| Endpoint | Super Admin | Master Admin | OPS Admin | OPS Agent | Travel Admin | Manager | Employee |
|----------|:-----------:|:------------:|:---------:|:---------:|:------------:|:-------:|:--------:|
| GET /admin/list | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| GET /:id | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /create | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /my-requests | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PATCH /:id/status | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /:id/upload-ticket | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /:id/upload-invoice | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /:id/download-ticket | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (own) | ✅ (own) |
| GET /:id/download-invoice | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (own) | ✅ (own) |

---

## API Endpoints

### Offline Reissue Endpoints

#### 1. **GET /api/v1/reissue/offline/admin/list**

Lists all offline reissue requests.

**Access:** Super Admin, Master Admin, OPS Admin

```bash
curl -X GET http://localhost:5000/api/v1/reissue/offline/admin/list \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "req_123",
        "orderId": "ORD-001",
        "travellerName": "John Doe",
        "status": "IN_PROGRESS",
        "bookedDate": "2026-05-10T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100
    }
  },
  "message": "Offline reissue requests fetched"
}
```

#### 2. **POST /api/v1/reissue/offline/create**

Create a new offline reissue request.

**Access:** All authenticated users

```bash
curl -X POST http://localhost:5000/api/v1/reissue/offline/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking_123",
    "reason": "Change travel date"
  }'
```

#### 3. **PATCH /api/v1/reissue/offline/:id/status**

Update the status of an offline reissue request.

**Access:** Super Admin, Master Admin, OPS Admin, OPS Agent

```bash
curl -X PATCH http://localhost:5000/api/v1/reissue/offline/req_123/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS",
    "message": "Processing request"
  }'
```

#### 4. **POST /api/v1/reissue/offline/:id/upload-ticket**

Upload a revised ticket.

**Access:** Super Admin, Master Admin, OPS Admin, OPS Agent

```bash
curl -X POST http://localhost:5000/api/v1/reissue/offline/req_123/upload-ticket \
  -H "Authorization: Bearer <token>" \
  -F "file=@ticket.pdf"
```

#### 5. **GET /api/v1/reissue/offline/:id/download-ticket**

Download the revised ticket.

**Access:** All authenticated users (employees see only own requests)

```bash
curl -X GET http://localhost:5000/api/v1/reissue/offline/req_123/download-ticket \
  -H "Authorization: Bearer <token>" \
  --output ticket.pdf
```

---

## Implementation Details

### 1. Centralized Permissions

**File:** `constants/reissuePermissions.constants.js`

```javascript
// Define all roles
const ROLES = {
  SUPER_ADMIN: "super-admin",
  MASTER_ADMIN: "master-admin",
  OPS_ADMIN: "ops-admin",
  OPS_AGENT: "ops-member",
  TRAVEL_ADMIN: "travel-admin",
  MANAGER: "manager",
  EMPLOYEE: "employee"
};

// Define all permissions
const PERMISSIONS = {
  ADMIN_LIST_REQUESTS: "admin:list_requests",
  OPS_UPDATE_STATUS: "ops:update_status",
  // ... more permissions
};

// Map permissions to roles
const PERMISSION_MATRIX = {
  "super-admin": [
    PERMISSIONS.ADMIN_LIST_REQUESTS,
    PERMISSIONS.ADMIN_UPDATE_STATUS,
    // ... all permissions
  ],
  "master-admin": [
    // Same as super-admin
  ],
  "ops-member": [
    PERMISSIONS.OPS_UPDATE_STATUS,
    PERMISSIONS.OPS_UPLOAD_TICKET,
    // ... ops permissions
  ]
};

// Helper function
function hasPermission(role, permission) {
  return PERMISSION_MATRIX[role]?.includes(permission);
}
```

### 2. Authorization Middleware

**File:** `middleware/authorizeReissueAccess.middleware.js`

```javascript
// Middleware to check specific permissions
exports.authorizeReissueAccess = (...requiredPermissions) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const hasAccess = hasAnyPermission(userRole, requiredPermissions);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action"
      });
    }
    
    req.userPermissions = PERMISSION_MATRIX[userRole];
    next();
  };
};

// Specialized middleware for admin-only endpoints
exports.authorizeOfflineReissueAdmin = (req, res, next) => {
  if (!OFFLINE_REISSUE_ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Only admins can perform this action"
    });
  }
  next();
};
```

### 3. Updated Route Configuration

**File:** `routes/reissue.offline.routes.js` (before)

```javascript
// OLD: Hard-coded role strings
router.get(
  "/admin/list",
  verifyToken,
  authorizeRoles("ops-member", "super-admin", "travel-admin"),
  controller.listAdmin
);
```

**File:** `routes/reissue.offline.routes.js` (after)

```javascript
// NEW: Centralized RBAC
router.get(
  "/admin/list",
  verifyToken,
  authorizeOfflineReissueAdmin,  // Uses permission matrix
  controller.listAdmin
);
```

### 4. Audit Logging

**File:** `services/auditLog.service.js`

```javascript
async function logAuditEvent(auditData) {
  const auditEntry = {
    timestamp: new Date(),
    actor: {
      id: auditData.actor.id,
      role: auditData.actor.role,
      email: auditData.actor.email
    },
    action: auditData.action,
    resource: {
      type: "reissue_request",
      id: auditData.requestId
    },
    changes: {
      previous: auditData.previousState,
      current: auditData.newState
    }
  };
  
  // Save to AuditLog model
  await AuditLog.create(auditEntry);
}

// Specialized logging functions
async function logStatusUpdate(actor, requestId, previousStatus, newStatus) {
  await logAuditEvent({
    actor,
    action: "OFFLINE_STATUS_UPDATED",
    requestId,
    previousState: { status: previousStatus },
    newState: { status: newStatus }
  });
}
```

---

## Usage Examples

### Example 1: Super Admin Accessing Admin List

```javascript
// Frontend (Super Admin Portal)
const response = await axios.get('/reissue/offline/admin/list', {
  headers: {
    'Authorization': `Bearer ${superAdminToken}`
  }
});

// Backend will:
// 1. verifyToken - validates JWT
// 2. authorizeOfflineReissueAdmin - checks if role is in OFFLINE_REISSUE_ADMIN_ROLES
// 3. controller.listAdmin - processes request
// 4. logAuditEvent - logs access
```

### Example 2: OPS Agent Updating Status

```javascript
// Frontend (OPS Dashboard)
const response = await axios.patch(
  `/reissue/offline/req_123/status`,
  { status: 'IN_PROGRESS' },
  {
    headers: {
      'Authorization': `Bearer ${opsToken}`
    }
  }
);

// Backend will:
// 1. verifyToken - validates JWT, sets req.user
// 2. authorizeOfflineReissueOps - checks if role in OPS roles
// 3. controller.updateStatus - updates DB
// 4. logStatusUpdate - logs status change
```

### Example 3: Employee Access Denied

```javascript
// Frontend (Employee Portal)
const response = await axios.get('/reissue/offline/admin/list', {
  headers: {
    'Authorization': `Bearer ${employeeToken}`
  }
});

// Response: 403 Forbidden
{
  "success": false,
  "message": "Only admins can perform this action",
  "allowedRoles": ["super-admin", "master-admin", "ops-admin"]
}
```

---

## Migration Guide

### For Existing Code

If you have existing code that hardcodes role checks, migrate as follows:

**BEFORE:**
```javascript
router.get(
  "/admin/list",
  verifyToken,
  authorizeRoles("super-admin", "ops-member"),
  controller.listAdmin
);
```

**AFTER:**
```javascript
router.get(
  "/admin/list",
  verifyToken,
  authorizeOfflineReissueAdmin,
  controller.listAdmin
);
```

### For Controllers

If your controllers check roles directly, update them:

**BEFORE:**
```javascript
exports.listAdmin = asyncHandler(async (req, res) => {
  if (req.user.role !== "ops-member" && req.user.role !== "super-admin") {
    return res.status(403).json({ message: "Unauthorized" });
  }
  // ... rest of logic
});
```

**AFTER:**
```javascript
// Middleware already checks authorization

exports.listAdmin = asyncHandler(async (req, res) => {
  // No role check needed - middleware handles it
  const result = await offlineReissueWorkflowService.listAdmin({
    actor: req.user,
    query: req.query
  });
  
  // Log the access
  await logAdminListAccess(req.user, getClientIp(req), req.get('user-agent'));
  
  res.status(200).json(new ApiResponse(200, result, "Success"));
});
```

---

## Testing

### Run RBAC Tests

```bash
# Run specific test suite
npm test -- server/src/modules/servicing/reissue/tests/reissue.rbac.test.js

# Run with coverage
npm test -- --coverage server/src/modules/servicing/reissue/tests/reissue.rbac.test.js
```

### Manual Testing with cURL

```bash
# 1. Test Super Admin can access admin list
curl -X GET http://localhost:5000/api/v1/reissue/offline/admin/list \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json"

# Expected: 200 OK with request list

# 2. Test Employee cannot access admin list
curl -X GET http://localhost:5000/api/v1/reissue/offline/admin/list \
  -H "Authorization: Bearer employeeToken..." \
  -H "Content-Type: application/json"

# Expected: 403 Forbidden

# 3. Test Employee can create request
curl -X POST http://localhost:5000/api/v1/reissue/offline/create \
  -H "Authorization: Bearer employeeToken..." \
  -H "Content-Type: application/json" \
  -d '{ "bookingId": "BOK123", "reason": "Change date" }'

# Expected: 201 Created with request ID
```

### Checklist for Validation

- [ ] Super Admin can access `/admin/list`
- [ ] Super Admin can update statuses
- [ ] Super Admin can upload files
- [ ] Master Admin has same access as Super Admin
- [ ] OPS Admin can list and update requests
- [ ] OPS Agent can update assigned requests
- [ ] OPS Agent cannot list all requests (403)
- [ ] Employee can create requests
- [ ] Employee cannot access admin endpoints (403)
- [ ] Employee cannot update status (403)
- [ ] Travel Admin can view admin list
- [ ] Travel Admin cannot update status (403)
- [ ] All sensitive operations are logged
- [ ] Audit logs include actor, action, resource, timestamp

---

## Security Considerations

### 1. Defense in Depth

```
Request → JWT Validation → Role Check → Permission Check → Operation → Audit Log
```

### 2. Principle of Least Privilege

Each role has only the permissions it needs:
- Employees cannot access admin functions
- OPS Agents cannot list all requests (prevents data leakage)
- Admins can override for emergency situations

### 3. Audit Trail

All sensitive operations are logged with:
- Actor ID, name, role, email
- Action type
- Resource ID
- Previous and new state
- Timestamp
- Client IP & User Agent

### 4. Future Extension

To add new permissions:

```javascript
// 1. Add to PERMISSIONS object
PERMISSIONS.NEW_FEATURE = "new:feature";

// 2. Add to appropriate roles in PERMISSION_MATRIX
PERMISSION_MATRIX["ops-member"].push(PERMISSIONS.NEW_FEATURE);

// 3. Create or reuse middleware
router.post("/new-endpoint", authorizeReissueAccess(PERMISSIONS.NEW_FEATURE), ...);
```

---

## Troubleshooting

### Issue: Master Admin gets 403

**Cause:** Old routes still use hard-coded role strings without "master-admin"

**Solution:** Ensure all routes use new middleware from `authorizeReissueAccess.middleware.js`

### Issue: OPS Agent can see all requests

**Cause:** Route using generic `authorizeRoles()` instead of `authorizeOfflineReissueOps()`

**Solution:** Replace `authorizeRoles("ops-member")` with `authorizeOfflineReissueOps`

### Issue: Audit logs not being created

**Cause:** AuditLog model not found or service not called

**Solution:** Ensure `auditLog.service.js` is imported in controllers and called after operations

---

## References

- [reissuePermissions.constants.js](../constants/reissuePermissions.constants.js) - Permission matrix
- [authorizeReissueAccess.middleware.js](../middleware/authorizeReissueAccess.middleware.js) - Authorization middleware
- [auditLog.service.js](../services/auditLog.service.js) - Audit logging
- [reissue.offline.routes.js](../routes/reissue.offline.routes.js) - Updated routes
- [reissue.rbac.test.js](../tests/reissue.rbac.test.js) - Test suite

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-11 | Initial RBAC implementation with Master Admin support |

