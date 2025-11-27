const Joi = require("joi");

// Create booking request
const createBooking = Joi.object({
  type: Joi.string().valid("flight", "hotel").required(),
  provider: Joi.string().optional(),
  pricing: Joi.object({
    total: Joi.number().min(0).required(),
    baseFare: Joi.number().min(0).optional(),
    taxes: Joi.number().min(0).optional(),
    currency: Joi.string().default("INR")
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

module.exports = {
  createBooking,
  approverAction,
  confirmBooking,
};
