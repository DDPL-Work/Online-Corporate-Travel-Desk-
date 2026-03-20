// ==========================================
// FILE: src/routes/dashboard.routes.js
// ==========================================
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

/* ==========================================
   EMPLOYEE DASHBOARD
========================================== */
router.get(
  '/employee',
  authorizeRoles('employee'),
  dashboardController.getEmployeeDashboard
);

/* ==========================================
   CORPORATE DASHBOARD
   (Travel Admin + Corporate Super Admin)
========================================== */
router.get(
  '/corporate',
  authorizeRoles('travel-admin', 'corporate-super-admin'),
  dashboardController.getCorporateDashboard
);

/* ==========================================
   PLATFORM SUPER ADMIN DASHBOARD
========================================== */
router.get(
  '/super-admin',
  authorizeRoles('super-admin'),
  dashboardController.getSuperAdminDashboard
);

module.exports = router;
