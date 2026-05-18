const express = require("express");
const { verifyToken } = require("../../../../middleware/auth.middleware");
const {
  authorizeOfflineReissueAdmin,
} = require("../middleware/authorizeReissueAccess.middleware");
const controller = require("../controllers/reissue.admin.controller");

const router = express.Router();

/**
 * ════════════════════════════════════════════════════════════════
 * ONLINE REISSUE ADMIN ROUTES
 * 
 * Allows: Super Admin, Master Admin
 * ════════════════════════════════════════════════════════════════
 */

router.use(verifyToken, authorizeOfflineReissueAdmin);

/**
 * GET /requests
 * List all online reissue requests with analytics
 */
router.get("/requests", controller.list);

/**
 * GET /analytics
 * Get analytics and metrics for online reissues
 */
router.get("/analytics", controller.analytics);

module.exports = router;
