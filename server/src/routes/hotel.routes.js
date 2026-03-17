const express = require("express");
const router = express.Router();

const hotelController = require("../controllers/hotel.controller");
// <<<<<<< HEAD
// =======
const hotelSearchController = require("../controllers/hotelSearch.controller");
// >>>>>>> 6c93c2a6864064eee402edb2e2c40c889dc71d90

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
// <<<<<<< HEAD
//   hotelController.searchHotels,
// );

// /* ======================================================
// HOTEL DETAILS
// ====================================================== */
// router.post(
//   "/details",
//   authorizeRoles("manager", "travel-admin", "corporateAdmin", "employee"),
//   hotelController.getStaticHotelDetails,
// =======
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
// >>>>>>> 6c93c2a6864064eee402edb2e2c40c889dc71d90
);

module.exports = router;
