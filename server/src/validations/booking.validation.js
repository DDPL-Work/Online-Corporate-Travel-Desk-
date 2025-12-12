const Joi = require("joi");

// =============================
// Booking Schemas
// =============================

// Create booking request
const createBooking = Joi.object({
  type: Joi.string().valid("flight", "hotel").required(),
  provider: Joi.string().optional(),
  pricing: Joi.object({
    total: Joi.number().min(0).required(),
    baseFare: Joi.number().min(0).optional(),
    taxes: Joi.number().min(0).optional(),
    currency: Joi.string().default("INR"),
  }).required(),
  requestData: Joi.any(),
});

// Approve / Reject booking
const approverAction = Joi.object({
  comment: Joi.string().allow("").max(1000).optional(),
});

// Booking confirmation
const confirmBooking = Joi.object({
  responseData: Joi.any().required(),
  voucherUrl: Joi.string().uri().optional(),
});

// Flight search validation
const searchFlight = Joi.object({
  origin: Joi.string().required(),
  destination: Joi.string().required(),
  departureDate: Joi.date().required(),
  returnDate: Joi.date().optional(),
  passengers: Joi.object({
    adults: Joi.number().min(1).required(),
    children: Joi.number().min(0).optional(),
    infants: Joi.number().min(0).optional(),
  }).required(),
  cabinClass: Joi.string().valid("economy", "business", "first").default("economy"),
});

// Hotel search validation
const searchHotel = Joi.object({
  cityCode: Joi.string().required(),
  checkIn: Joi.date().required(),
  checkOut: Joi.date().required(),
  rooms: Joi.number().min(1).required(),
  guests: Joi.number().min(1).required(),
});

module.exports = {
  createBooking,
  approverAction,
  confirmBooking,
  searchFlight,
  searchHotel,
};
