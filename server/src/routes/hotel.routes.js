const express = require("express");
const router = express.Router();

const hotelController = require("../controllers/hotel.controller");
const hotelSearchController = require("../controllers/hotelSearch.controller");

const bookingValidation = require("../validations/booking.validation");
const {
  authorizeRoles,
  verifyToken,
} = require("../middleware/auth.middleware");
const { searchLimiter } = require("../middleware/rateLimit.middleware");
const validate = require("../middleware/validate.middleware");

router.use(verifyToken);

/* ======================================================
   STATIC SERVICES
====================================================== */

router.get(
  "/countries",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelController.getCountryList,
);

router.get("/country-list", hotelController.getCountriesFromDB);

router.get(
  "/cities",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelController.getCityList,
);

/* ======================================================
   HOTEL SEARCH & DETAILS
====================================================== */

router.post(
  "/search",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  searchLimiter,
  validate(bookingValidation.searchHotel),
  hotelSearchController.searchHotels,
);

router.post(
  "/details",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelSearchController.getHotelDetails,
);

router.post(
  "/room-info",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelSearchController.getRoomInfo,
);

router.post(
  "/booking-details",
  authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
  hotelSearchController.getBookingDetails,
);

module.exports = router;
