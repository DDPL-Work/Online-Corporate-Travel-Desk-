// server/src/routes/flight.routes.js

const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flight.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { bookingValidation } = require('../validations');
const { searchLimiter } = require('../middleware/rateLimit.middleware');

// Protect all routes
router.use(verifyToken);

// Search flights
router.post(
  '/search',
  authorizeRoles('manager', 'travel-admin', 'corporateAdmin'),
  searchLimiter,
  validate(bookingValidation.searchFlights), // now works
  flightController.searchFlights
);

// Fare quote
router.post(
  '/fare-quote',
  authorizeRoles('manager', 'travel-admin', 'corporateAdmin'),
  validate(bookingValidation.fareQuote),
  flightController.getFareQuote
);

// Fare rules
router.post(
  '/fare-rules',
  authorizeRoles('manager', 'travel-admin', 'corporateAdmin'),
  flightController.getFareRules
);

module.exports = router;
