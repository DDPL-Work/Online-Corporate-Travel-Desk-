// hotelBooking.routes.js

const express = require("express");
const router = express.Router();

const {
  authorizeRoles,
  verifyToken,
} = require("../middleware/auth.middleware");

const corporateContext = require("../middleware/corporate.middleware");

const hotelBookingController = require("../controllers/hotelBooking.controller");

router.use(verifyToken);

/* ======================================================
   PRE BOOK HOTEL
====================================================== */
router.post(
  "/prebook",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  corporateContext,
  hotelBookingController.preBookHotel,
);

/* ======================================================
   CREATE REQUEST
====================================================== */
router.post(
  "/create-request",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  corporateContext,
  hotelBookingController.createHotelBookingRequest,
);

/* ======================================================
   FETCH HOTEL BOOKING REQUESTS
====================================================== */

// ✅ Get all my hotel requests (pending + approved)
router.get(
  "/my",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelBookingController.getMyHotelRequests,
);

// ✅ Specific routes FIRST (VERY IMPORTANT)
router.get(
  "/my/rejected",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelBookingController.getMyRejectedHotelRequests,
);

router.get(
  "/my/completed",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelBookingController.getMyHotelBookings,
  // OR use: getMyCompletedHotelBookings (if separate logic exists)
);

// ❗ Dynamic route ALWAYS LAST
router.get(
  "/my/:id",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelBookingController.getMyHotelRequestById,
);

/* ======================================================
   EXECUTE BOOKING (AFTER APPROVAL)
====================================================== */

router.post(
  "/:bookingId/execute",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelBookingController.executeApprovedHotelBooking,
);

// ✅ Keep this AFTER /my routes to avoid conflicts
router.get(
  "/:id/details",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelBookingController.getBookedHotelDetails,
);

router.post(
  "/:id/voucher",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelBookingController.generateHotelVoucher,
);

router.get(
  "/get-project-hotel-expenses/:projectId",
  hotelBookingController.getProjectHotelExpenses,
);

module.exports = router;
