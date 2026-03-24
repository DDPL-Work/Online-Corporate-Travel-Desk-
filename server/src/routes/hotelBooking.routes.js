// hotelBooking.routes.js

const express = require("express");
const router = express.Router();

const {
  authorizeRoles,
  verifyToken,
} = require("../middleware/auth.middleware");

const corporateContext = require("../middleware/corporate.middleware");

const {
  createHotelBookingRequest,
  getMyHotelRequests,
  getMyHotelRequestById,
  getMyRejectedHotelRequests,
  executeApprovedHotelBooking,
  getBookedHotelDetails,
  getMyHotelBookings,
  generateHotelVoucher,
} = require("../controllers/hotelBooking.controller");

router.use(verifyToken);

/* ======================================================
   CREATE REQUEST
====================================================== */
router.post(
  "/create-request",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  corporateContext,
  createHotelBookingRequest
);

/* ======================================================
   FETCH HOTEL BOOKING REQUESTS
====================================================== */

// ✅ Get all my hotel requests (pending + approved)
router.get(
  "/my",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  getMyHotelRequests
);

// ✅ Specific routes FIRST (VERY IMPORTANT)
router.get(
  "/my/rejected",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  getMyRejectedHotelRequests
);

router.get(
  "/my/completed",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  getMyHotelBookings
  // OR use: getMyCompletedHotelBookings (if separate logic exists)
);

// ❗ Dynamic route ALWAYS LAST
router.get(
  "/my/:id",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  getMyHotelRequestById
);

/* ======================================================
   EXECUTE BOOKING (AFTER APPROVAL)
====================================================== */

router.post(
  "/:bookingId/execute",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  executeApprovedHotelBooking
);

// ✅ Keep this AFTER /my routes to avoid conflicts
router.get(
  "/:id/details",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  getBookedHotelDetails
);

router.post(
  "/:id/voucher",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  generateHotelVoucher
);

module.exports = router;