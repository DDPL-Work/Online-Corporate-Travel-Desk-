const express = require("express");
const { verifyToken } = require("../../../../middleware/auth.middleware");
const {
  authorizeOfflineReissueEmployee,
} = require("../middleware/authorizeReissueAccess.middleware");
const controller = require("../controllers/reissue.employee.controller");

const router = express.Router();

/**
 * ════════════════════════════════════════════════════════════════
 * ONLINE REISSUE EMPLOYEE ROUTES
 * 
 * These are online reissue workflow endpoints.
 * Allows: Employee, Manager, Travel Admin, OPS, Super Admin, Master Admin
 * ════════════════════════════════════════════════════════════════
 */

router.use(verifyToken, authorizeOfflineReissueEmployee);

/**
 * GET /eligibility/:bookingId
 * Check if a booking is eligible for online reissue
 * (must come before /:id to avoid route shadowing)
 */
router.get("/eligibility/:bookingId", controller.checkEligibility);

/**
 * POST /search
 * Search available flights for reissue
 */
router.post("/search", controller.search);

/**
 * POST /create
 * Create a new online reissue request
 */
router.post("/create", controller.create);

/**
 * GET /my
 * Get user's own reissue requests
 */
router.get("/my", controller.getMyRequests);

/**
 * GET /company
 * Get all company reissue requests (online + offline)
 */
router.get("/company", controller.getCompanyRequests);

/**
 * GET /:id
 * Get details of a specific reissue request
 */
router.get("/:id", controller.getById);

/**
 * POST /:id/farequote
 * Get fare quote for reissue
 */
router.post("/:id/farequote", controller.fareQuote);

/**
 * POST /:id/quote
 * Preview quote before confirmation
 */
router.post("/:id/quote", controller.previewQuote);

/**
 * POST /:id/confirm
 * Confirm and process the reissue request
 */
router.post("/:id/confirm", controller.confirm);

module.exports = router;
