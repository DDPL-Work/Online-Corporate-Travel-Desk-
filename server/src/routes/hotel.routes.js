const express = require("express");
const router = express.Router();

const hotelSearchController = require("../controllers/hotelSearch.controller");
const hotelBookingController = require("../controllers/hotelBooking.controller");

const bookingValidation = require("../validations/booking.validation");
const {
  authorizeRoles,
  verifyToken,
} = require("../middleware/auth.middleware");
const { searchLimiter } = require("../middleware/rateLimit.middleware");
const validate = require("../middleware/validate.middleware");

router.use(verifyToken);

/* ======================================================
   HOTEL SEARCH
====================================================== */

router.post(
  "/search",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  searchLimiter,
  validate(bookingValidation.searchHotel),
  hotelSearchController.searchHotels,
);

/* ======================================================
   HOTEL DETAILS
====================================================== */

router.post(
  "/details",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelSearchController.getHotelDetails,
);

/* ======================================================
   ROOM INFO
====================================================== */

router.post(
  "/rooms",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelSearchController.getRoomInfo,
);

/* ======================================================
   HOTEL BOOK
====================================================== */

router.post(
  "/book",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelBookingController.bookHotel,
);

/* ======================================================
   BOOKING DETAILS
====================================================== */

router.get(
  "/booking/:bookingId",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelBookingController.getBookingDetails,
);

/* ======================================================
   CANCEL HOTEL
====================================================== */

router.post(
  "/cancel",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelBookingController.cancelHotel,
);

module.exports = router;
