const express = require('express');
const router = express.Router();

const hotelController = require('../controllers/hotel.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware'); // ✅ FIX
const { bookingValidation } = require('../validations');
const { searchLimiter } = require('../middleware/rateLimit.middleware');

// Protect all routes
router.use(verifyToken);

// Hotel search (POST)
router.post(
  '/search',
  authorizeRoles('manager', 'travel-admin', 'corporateAdmin'),
  searchLimiter,
  validate(bookingValidation.searchHotel),
  hotelController.searchHotels
);

// Hotel details (GET)
router.get(
  '/:hotelCode',
  authorizeRoles('manager', 'travel-admin', 'corporateAdmin'),
  hotelController.getHotelDetails
);

module.exports = router;
