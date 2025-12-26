const express = require('express');
const router = express.Router();

// Controllers
const flightController = require('../controllers/flight.controller');

// Middleware
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { searchLimiter } = require('../middleware/rateLimit.middleware');

// Validations (Joi)
const bookingValidation = require('../validations/booking.validation');

// ------------------------------------
// All flight routes require auth
router.use(verifyToken);

// ------------------------------------
// 1️⃣ Flight Search
router.post(
  '/search',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin', "employee"),
  searchLimiter,
  validate(bookingValidation.searchFlights),
  flightController.searchFlights
);

// ------------------------------------
// 2️⃣ Fare Quote
router.post(
  '/fare-quote',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin', "employee"),
  validate(bookingValidation.fareQuote),
  flightController.getFareQuote
);

// ------------------------------------
// 3️⃣ Fare Rule
router.post(
  '/fare-rule',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin', "employee"),
  validate(bookingValidation.fareRule),
  flightController.getFareRule
);

// ------------------------------------
// 4 SSR
router.post(
  '/ssr',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin', "employee"),
  validate(bookingValidation.ssr),
  flightController.getSSR
);

// ------------------------------------
// 5️ Book Flight
router.post(
  '/book',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin', "employee"),
 
  flightController.bookFlight
);

// ------------------------------------
//  Ticket Flight
router.post(
  '/ticket',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin', "employee"),
  validate(bookingValidation.ticketFlight),
  flightController.ticketFlight
);

// ------------------------------------
router.post(
  '/fare-upsell',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin', "employee"),
  validate(bookingValidation.fareUpsell),
  flightController.getFareUpsell
);

// ------------------------------------
//  Retrieve Booking
router.get(
  '/booking/:pnr',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin', "employee"),
  flightController.getBookingDetails
);


module.exports = router;
