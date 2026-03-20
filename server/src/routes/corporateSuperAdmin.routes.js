const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const controller = require('../controllers/corporateSuperAdmin.controller');

/* Only corporate-super-admin allowed */

router.use(verifyToken);
router.use(authorizeRoles('corporate-super-admin'));

// Get all corporate users
router.get('/users', controller.getCorporateUsers);

// Activate / deactivate user
router.patch('/users/:userId/toggle', controller.toggleUserStatus);

// Change travel admin
router.patch('/travel-admin', controller.changeTravelAdmin);

// Update travel policy
router.patch('/travel-policy', controller.updateTravelPolicy);

// Dashboard
router.get('/dashboard', controller.getCorporateDashboard);

module.exports = router;
