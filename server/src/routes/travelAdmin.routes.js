const express = require("express");
const router = express.Router();

const adminBookingCtrl = require("../controllers/travelAdmin.controller");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");

/**
 * ============================================================
 * 🔐 AUTH MIDDLEWARE (ALL ROUTES PROTECTED)
 * ============================================================
 */
router.use(verifyToken);

/**
 * ============================================================
 * 🧑‍💼 ADMIN ACCESS ONLY (TRAVEL ADMIN / CORPORATE ADMIN)
 * ============================================================
 */
router.use(authorizeRoles("travel-admin", "corporate-admin"));

/**
 * ============================================================
 * ✈️ FLIGHT BOOKINGS (SSO BASED)
 * ============================================================
 */
router.get("/flights", adminBookingCtrl.getAllFlightBookingsAdmin);

/**
 * ============================================================
 * 🏨 HOTEL BOOKINGS (SSO BASED)
 * ============================================================
 */
router.get("/hotels", adminBookingCtrl.getAllHotelBookingsAdmin);
router.get("/hotels/cancelled", adminBookingCtrl.getCancelledHotelBookingsAdmin);

module.exports = router;
