// server/src/routes/hotelAmendment.routes.js

const express = require("express");
const router = express.Router();

const {
  amendHotelBooking,
  getAmendmentStatus,
} = require("../controllers/hotelAmendment.controller");

// Middleware
const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { searchLimiter } = require("../middleware/rateLimit.middleware");

// ------------------------------------
// All hotel routes require auth
router.use(verifyToken);

/* =========================================
   HOTEL AMENDMENT ROUTES
========================================= */

/**
 * @route   POST /api/hotel/amendment/request
 * @desc    Send amendment request to TBO
 */
router.post(
  "/request",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  (req, res, next) => {
    if (!req.body.bookingId) {
      return res.status(400).json({
        success: false,
        message: "bookingId is required",
      });
    }
    next();
  },
  amendHotelBooking,
);

/**
 * @route   POST /api/hotel/amendment/status
 * @desc    Get amendment status from TBO
 */
router.post(
  "/status",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  getAmendmentStatus,
);

module.exports = router;
