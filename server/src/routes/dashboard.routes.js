// ==========================================
// FILE: src/routes/dashboard.routes.js
// ==========================================
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");

router.use(verifyToken);

/* ==========================================
   EMPLOYEE DASHBOARD
========================================== */
router.get(
  "/employee",
  authorizeRoles("employee"),
  dashboardController.getEmployeeDashboard,
);

/* ==========================================
   CORPORATE DASHBOARD
   (Travel Admin)
========================================== */
router.get(
  "/corporate",
  authorizeRoles("travel-admin"),
  dashboardController.getCorporateDashboard,
);

/* ==========================================
   CORPORATE DASHBOARD
   (Manager)
========================================== */
router.get(
  "/corporate-manager",
  authorizeRoles("manager"),
  dashboardController.getManagerDashboard,
);

/* ==========================================
   PLATFORM SUPER ADMIN DASHBOARD
========================================== */
router.get(
  "/super-admin",
  authorizeRoles("super-admin", "ops-member"),
  dashboardController.getSuperAdminDashboard,
);

module.exports = router;
