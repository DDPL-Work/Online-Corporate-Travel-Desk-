// booking.validation.js

const Joi = require("joi");

/* ---------------- SSR ---------------- */
const ssr = Joi.object({
  traceId: Joi.string().required(),
  resultIndex: Joi.string().required(),
});


// Create booking
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

const bookFlight = Joi.object({
  traceId: Joi.string().required(),
  resultIndex: Joi.string().required(),

  fareQuote: Joi.object({
    IsLCC: Joi.boolean().required(),

    Currency: Joi.string().required(),
    BaseFare: Joi.number().required(),
    Tax: Joi.number().required(),
    PublishedFare: Joi.number().required(),
    OfferedFare: Joi.number().optional(),

    YQTax: Joi.number().optional(),
    OtherCharges: Joi.number().optional(),
    Discount: Joi.number().optional(),

    CommissionEarned: Joi.number().optional(),
    PLBEarned: Joi.number().optional(),
    IncentiveEarned: Joi.number().optional(),

    ServiceFee: Joi.number().optional(),
    TotalBaggageCharges: Joi.number().optional(),
    TotalMealCharges: Joi.number().optional(),
    TotalSeatCharges: Joi.number().optional(),
    TotalSpecialServiceCharges: Joi.number().optional()
  }).required(),

  passengers: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      paxType: Joi.string().valid("ADULT", "CHILD", "INFANT").required(),

      gender: Joi.string().valid("Male", "Female").required(),
      contactNo: Joi.string().required(),
      email: Joi.string().email().required(),

      dateOfBirth: Joi.date().optional(),

      passportNo: Joi.string().optional(),
      passportExpiry: Joi.date().optional(),
      passportIssueDate: Joi.date().optional()
    })
  ).min(1).required(),

  ssr: Joi.object({
    baggage: Joi.array().optional(),
    meal: Joi.array().optional(),
    seat: Joi.array().optional()
  }).optional(),

  isHold: Joi.boolean().default(false)
});



// Approve / Reject
const approverAction = Joi.object({
  comment: Joi.string().allow("").max(1000).optional(),
});

// Confirm booking
const confirmBooking = Joi.object({
  responseData: Joi.any().required(),
  voucherUrl: Joi.string().uri().optional(),
});

// Flight search
const searchFlights = Joi.object({
  origin: Joi.string().required(),
  destination: Joi.string().required(),
  departureDate: Joi.date().required(),
  returnDate: Joi.date().optional(),
  adults: Joi.number().min(1).required(),
  children: Joi.number().min(0).optional(),
  infants: Joi.number().min(0).optional(),
  cabinClass: Joi.string().valid("economy", "business", "first").default("economy"),
});



const fareQuote = Joi.object({
  traceId: Joi.string().required(),
  resultIndex: Joi.string().required(), // ✔ change from number to string
});


// Hotel search
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
  searchFlights,
  fareQuote,     
  searchHotel,
  ssr,
  bookFlight,
};
