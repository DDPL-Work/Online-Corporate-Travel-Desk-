const express = require('express');
const router = express.Router();

// Controllers
const flightController = require('../controllers/flight.controller');

// Middleware
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { searchLimiter } = require('../middleware/rateLimit.middleware');

// Validations
const { bookingValidation } = require('../validations');

// --------------------------------------------------
// All flight routes require authentication
router.use(verifyToken);

// --------------------------------------------------
// 1️⃣ Flight Search
router.post(
  '/search',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin'),
  searchLimiter,
  validate(bookingValidation.searchFlights),
  flightController.searchFlights
);

// --------------------------------------------------
// 2️⃣ Fare Quote (MANDATORY)
router.post(
  '/fare-quote',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin'),
  validate(bookingValidation.fareQuote),
  flightController.getFareQuote
);

// --------------------------------------------------
// 3️⃣ Fare Rule
router.post(
  '/fare-rule',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin'),
  validate(bookingValidation.fareRule),
  flightController.getFareRule
);

// --------------------------------------------------
// 4️⃣ SSR (Seat / Meal / Baggage)
router.post(
  '/ssr',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin'),
  validate(bookingValidation.ssr),
  flightController.getSSR
);

// --------------------------------------------------
// 5️⃣ Book Flight
router.post(
  '/book',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin'),
  validate(bookingValidation.bookFlight),
  flightController.bookFlight
);

// --------------------------------------------------
// 6️⃣ Ticket Flight
router.post(
  '/ticket',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin'),
  validate(bookingValidation.ticketFlight),
  flightController.ticketFlight
);

// --------------------------------------------------
// 7️⃣ Retrieve Booking
router.get(
  '/booking/:pnr',
  authorizeRoles('manager', 'travel-admin', 'corporate-admin'),
  flightController.getBookingDetails
);

module.exports = router;
