// ==========================================
// FILE: src/routes/dashboard.routes.js
// ==========================================
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.get('/employee', authorizeRoles('employee'), dashboardController.getEmployeeDashboard);
router.get('/travel-admin', authorizeRoles('travel-admin'), dashboardController.getTravelAdminDashboard);
router.get('/super-admin', authorizeRoles('super-admin'), dashboardController.getSuperAdminDashboard);

module.exports = router;