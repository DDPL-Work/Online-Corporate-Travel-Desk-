# RBAC Quick Reference Guide

## Quick Links

- 📋 [Full Implementation Guide](./RBAC_IMPLEMENTATION.md)
- 🚀 [Deployment & Verification Guide](./DEPLOYMENT_GUIDE.md)
- 🧪 [Test Suite](./tests/reissue.rbac.test.js)

---

## 🎯 Core Concepts

### Roles
```javascript
"super-admin"      // Full system access
"master-admin"     // Enterprise-level admin (new)
"ops-admin"        // Operations management
"ops-member"       // Operations staff
"travel-admin"     // Travel coordination
"manager"          // Department manager
"employee"         // End user
```

### Key Locations
```
constants/reissuePermissions.constants.js    // Permission matrix
middleware/authorizeReissueAccess.middleware.js // Auth middleware  
services/auditLog.service.js                 // Audit logging
routes/reissue.offline.routes.js            // Updated routes
```

---

## 🔑 Common Tasks

### Check if User Can Perform Action

```javascript
const { hasPermission, PERMISSIONS } = 
  require("./constants/reissuePermissions.constants");

// Check specific permission
if (hasPermission(user.role, PERMISSIONS.ADMIN_LIST_REQUESTS)) {
  // Allow action
}
```

### Add New Role

1. **Update Constants:**
   ```javascript
   // reissuePermissions.constants.js
   const ROLES = {
     NEW_ROLE: "new-role",  // Add here
     // ...
   };
   ```

2. **Add Permissions:**
   ```javascript
   const PERMISSION_MATRIX = {
     "new-role": [
       PERMISSIONS.EMPLOYEE_CREATE_REQUEST,
       PERMISSIONS.EMPLOYEE_VIEW_OWN,
       // Add required permissions
     ],
   };
   ```

3. **Add to Role Groups:**
   ```javascript
   const OFFLINE_REISSUE_EMPLOYEE_ROLES = [
     // ...
     ROLES.NEW_ROLE,  // Add here
   ];
   ```

### Add New Permission

1. **Define in Constants:**
   ```javascript
   const PERMISSIONS = {
     NEW_FEATURE_ACTION: "feature:new_action",
   };
   ```

2. **Add to Role(s):**
   ```javascript
   const PERMISSION_MATRIX = {
     "ops-admin": [
       // ...
       PERMISSIONS.NEW_FEATURE_ACTION,
     ],
   };
   ```

3. **Use in Route:**
   ```javascript
   router.post(
     "/new-feature",
     verifyToken,
     authorizeReissueAccess(PERMISSIONS.NEW_FEATURE_ACTION),
     controller.newFeature
   );
   ```

### Protect an Endpoint

**Option 1: Generic Permission Check**
```javascript
router.get(
  "/special-data",
  verifyToken,
  authorizeReissueAccess(PERMISSIONS.ADMIN_VIEW_REQUEST),
  controller.getSpecialData
);
```

**Option 2: Admin Only**
```javascript
router.get(
  "/admin-panel",
  verifyToken,
  authorizeOfflineReissueAdmin,
  controller.adminPanel
);
```

**Option 3: OPS Only**
```javascript
router.patch(
  "/:id/status",
  verifyToken,
  authorizeOfflineReissueOps,
  controller.updateStatus
);
```

### Log an Action

```javascript
const { logAuditEvent, logStatusUpdate, getClientIp } = 
  require("../services/auditLog.service");

// Log status change
await logStatusUpdate(
  req.user,
  requestId,
  oldStatus,
  newStatus,
  "Updated via manual intervention",
  getClientIp(req),
  req.get('user-agent')
);

// Log custom action
await logAuditEvent({
  actor: req.user,
  action: "CUSTOM_ACTION",
  requestId,
  module: "offline_reissue",
  details: "Custom action performed",
  ipAddress: getClientIp(req),
  userAgent: req.get('user-agent')
});
```

---

## 🔒 Authorization Middleware Reference

### Available Middleware

```javascript
// Check multiple permissions (any one required)
authorizeReissueAccess(PERMISSIONS.ADMIN_LIST, PERMISSIONS.OPS_UPDATE)

// Admin endpoints only (Super, Master, OPS Admin)
authorizeOfflineReissueAdmin

// OPS endpoints (Admin + Agents)
authorizeOfflineReissueOps

// Employee endpoints (Employee + Manager + Travel Admin)
authorizeOfflineReissueEmployee

// Any reissue access (all employees + ops + admins)
authorizeOfflineReissueAccess
```

### Usage Pattern

```javascript
// Route definition
router.get(
  "/endpoint",
  verifyToken,                              // 1. Validate token
  authorizeOfflineReissueAdmin,            // 2. Check authorization
  controller.handler                        // 3. Handle request
);

// Controller
exports.handler = asyncHandler(async (req, res) => {
  // req.user         - User info with role
  // req.userPermissions - Array of user's permissions
  
  const result = await service.doSomething({
    actor: req.user,
    data: req.body
  });
  
  // Log the action
  await logAuditEvent({...});
  
  res.json(result);
});
```

---

## 📊 Access Matrix

| Endpoint | Super | Master | OPS Admin | OPS Agnt | T.Admin | Manager | Employee |
|----------|:-----:|:------:|:---------:|:--------:|:-------:|:-------:|:--------:|
| GET /admin/list | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| POST /create | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /my-requests | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /:id | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PATCH /:id/status | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /:id/upload-ticket | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /:id/download-ticket | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🧪 Testing Endpoint Access

```bash
# Set variables
TOKEN="your-jwt-token"
ROLE="super-admin"  # Change role for different tests
ENDPOINT="http://localhost:5000/api/v1/reissue/offline/admin/list"

# Test GET endpoint
curl -X GET "$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Test POST endpoint
curl -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# Test with jq for pretty output
curl -s -X GET "$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Check status code only
curl -s -o /dev/null -w "%{http_code}" -X GET "$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚨 Common Mistakes

### ❌ Hard-Coding Roles

```javascript
// DON'T DO THIS
if (req.user.role === "super-admin" || req.user.role === "ops-member") {
  // ...
}
```

### ✅ Use Permission Matrix

```javascript
// DO THIS
const { OFFLINE_REISSUE_ADMIN_ROLES } = 
  require("./constants/reissuePermissions.constants");

if (OFFLINE_REISSUE_ADMIN_ROLES.includes(req.user.role)) {
  // ...
}
```

### ❌ Forgetting Audit Logs

```javascript
// DON'T DO THIS
exports.updateStatus = async (req, res) => {
  await request.updateOne({ status: req.body.status });
  res.json({ success: true }); // No logging!
};
```

### ✅ Include Audit Logging

```javascript
// DO THIS
exports.updateStatus = async (req, res) => {
  const oldStatus = request.status;
  await request.updateOne({ status: req.body.status });
  
  await logStatusUpdate(
    req.user,
    request._id,
    oldStatus,
    req.body.status,
    req.body.message
  );
  
  res.json({ success: true });
};
```

### ❌ Wrong Middleware

```javascript
// DON'T DO THIS - using old authorizeRoles
router.get("/admin/list",
  verifyToken,
  authorizeRoles("ops-member", "super-admin"),  // Missing master-admin!
  controller.list
);
```

### ✅ Use New Middleware

```javascript
// DO THIS - using new centralized authorization
router.get("/admin/list",
  verifyToken,
  authorizeOfflineReissueAdmin,  // Handles all admin roles
  controller.list
);
```

---

## 🔍 Debugging

### Check User Permissions

```javascript
// In controller or middleware
console.log("User Role:", req.user.role);
console.log("User Permissions:", req.userPermissions);
console.log("All RBAC Constants:", PERMISSION_MATRIX);
```

### Check Authorization Failures

```javascript
// Enable debug mode
process.env.DEBUG_RBAC = "true";

// Look for 403 responses in logs
// Check if role is in allowed roles
// Verify middleware order in routes
```

### Verify Audit Logs

```javascript
// Check if logs are being created
db.auditlegs.find({ action: "OFFLINE_STATUS_UPDATED" }).pretty()

// Check recent access
db.auditlegs.find().sort({ timestamp: -1 }).limit(10).pretty()

// Check failed access attempts
db.auditlegs.find({ action: { $regex: "DENIED|FAILED" } }).pretty()
```

---

## 📖 Example Implementation

### Complete Route Implementation

```javascript
// routes/reissue.offline.routes.js
const express = require("express");
const { verifyToken } = require("../../../../middleware/auth.middleware");
const {
  authorizeOfflineReissueAdmin,
  authorizeOfflineReissueOps
} = require("../middleware/authorizeReissueAccess.middleware");
const controller = require("../controllers/reissue.offline.controller");

const router = express.Router();

/**
 * Admin only - list all requests
 */
router.get(
  "/admin/list",
  verifyToken,
  authorizeOfflineReissueAdmin,
  controller.listAdmin
);

/**
 * OPS only - update status
 */
router.patch(
  "/:id/status",
  verifyToken,
  authorizeOfflineReissueOps,
  controller.updateStatus
);

module.exports = router;
```

### Complete Controller Implementation

```javascript
// controllers/reissue.offline.controller.js
const asyncHandler = require("../../../../utils/asyncHandler");
const ApiResponse = require("../../../../utils/ApiResponse");
const { logStatusUpdate, getClientIp } = 
  require("../services/auditLog.service");

/**
 * List all offline reissue requests (admin view)
 */
exports.listAdmin = asyncHandler(async (req, res) => {
  const requests = await OfflineReissue.find()
    .skip((req.query.page - 1) * req.query.limit)
    .limit(req.query.limit);

  res.json(
    new ApiResponse(200, { data: requests }, "Requests fetched")
  );
});

/**
 * Update request status
 */
exports.updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, message } = req.body;

  const request = await OfflineReissue.findById(id);
  const oldStatus = request.status;

  request.status = status;
  await request.save();

  // Log the change
  await logStatusUpdate(
    req.user,
    id,
    oldStatus,
    status,
    message,
    getClientIp(req),
    req.get('user-agent')
  );

  res.json(
    new ApiResponse(200, request, "Status updated")
  );
});
```

---

## 🆘 Getting Help

1. **Check the documentation:** [RBAC_IMPLEMENTATION.md](./RBAC_IMPLEMENTATION.md)
2. **Review test suite:** [reissue.rbac.test.js](./tests/reissue.rbac.test.js)
3. **Check deployment guide:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
4. **Search code for examples:** `grep -r "authorizeOfflineReissueAdmin" server/`
5. **Contact:** Your backend/security team

---

## 📝 Checklist for Code Reviews

When reviewing reissue RBAC code:

- [ ] Middleware is applied (verifyToken + authorize*)
- [ ] Role check uses centralized constants, not hard-coded strings
- [ ] Audit logging is called for sensitive operations
- [ ] Error messages don't leak sensitive info
- [ ] Tests cover both allowed and denied cases
- [ ] Documentation updated
- [ ] No deprecated authorizeRoles() usage
- [ ] IP address and user agent captured in audit logs

---

## 📞 Version Info

- **Implementation Date:** May 11, 2026
- **Version:** 1.0
- **Status:** Production Ready
- **Last Updated:** May 11, 2026

