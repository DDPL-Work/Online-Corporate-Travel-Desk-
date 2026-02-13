// booking.validation.js
const Joi = require("joi");

/* ---------------- COMMON SSR SCHEMAS ---------------- */

const seatSSR = Joi.object({
  segmentIndex: Joi.number().min(0).required(),
  paxIndex: Joi.number().min(0).required(), // passenger index
  seatCode: Joi.string().required(), // e.g. 12A
  seatType: Joi.string().optional(), // WINDOW / AISLE / MIDDLE
  row: Joi.number().optional(),
  column: Joi.string().optional(),
  price: Joi.number().min(0).default(0),
  currency: Joi.string().default("INR"),
  isChargeable: Joi.boolean().default(false),
});

const mealSSR = Joi.object({
  segmentIndex: Joi.number().min(0).required(),
  paxIndex: Joi.number().min(0).required(),
  code: Joi.string().required(),
  description: Joi.string().optional(),
  price: Joi.number().min(0).default(0),
  currency: Joi.string().default("INR"),
});

const baggageSSR = Joi.object({
  segmentIndex: Joi.number().min(0).required(),
  paxIndex: Joi.number().min(0).required(),
  code: Joi.string().required(),
  weight: Joi.string().optional(), // e.g. 15KG
  price: Joi.number().min(0).default(0),
  currency: Joi.string().default("INR"),
});

/* ---------------- SSR ---------------- */
const ssr = Joi.object({
  traceId: Joi.string().required(),
  resultIndex: Joi.string().required(),

  seat: Joi.array().items(seatSSR).optional(),
  meal: Joi.array().items(mealSSR).optional(),
  baggage: Joi.array().items(baggageSSR).optional(),
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

// ✅ Updated Flight Booking Validation
const bookFlight = Joi.object({
  traceId: Joi.string().required(),
  resultIndex: Joi.string().required(),

  // Top-level Fare
  Fare: Joi.object({
    Currency: Joi.string().required(),
    BaseFare: Joi.number().required(),
    Tax: Joi.number().required(),
    YQTax: Joi.number().optional(),
    TransactionFee: Joi.number().optional(),
    AdditionalTxnFeeOfrd: Joi.number().optional(),
    AdditionalTxnFeePub: Joi.number().optional(),
    AirTransFee: Joi.number().optional(),
    PublishedFare: Joi.number().required(),
    OfferedFare: Joi.number().optional(),
  }).required(),

  // Passengers
  passengers: Joi.array()
    .items(
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
        passportIssueDate: Joi.date().optional(),
        Fare: Joi.object({
          // Optional now
          Currency: Joi.string().required(),
          BaseFare: Joi.number().required(),
          Tax: Joi.number().required(),
          YQTax: Joi.number().optional(),
          TransactionFee: Joi.number().optional(),
          AdditionalTxnFeeOfrd: Joi.number().optional(),
          AdditionalTxnFeePub: Joi.number().optional(),
          AirTransFee: Joi.number().optional(),
          PublishedFare: Joi.number().required(),
          OfferedFare: Joi.number().optional(),
        }).optional(),
      }),
    )
    .min(1)
    .required(),

  ssr: Joi.object({
    baggage: Joi.array().optional(),
    meal: Joi.array().optional(),
    seat: Joi.array().optional(),
  }).optional(),

  isHold: Joi.boolean().default(false),
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
// Flight search
const searchFlights = Joi.object({
  journeyType: Joi.number().valid(1, 2, 3).required(),

  // ONE-WAY / ROUND-TRIP
  origin: Joi.when("journeyType", {
    is: Joi.valid(1, 2),
    then: Joi.string().length(3).required(),
    otherwise: Joi.forbidden(),
  }),

  destination: Joi.when("journeyType", {
    is: Joi.valid(1, 2),
    then: Joi.string().length(3).required(),
    otherwise: Joi.forbidden(),
  }),

  departureDate: Joi.when("journeyType", {
    is: Joi.valid(1, 2),
    then: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "departureDate must be YYYY-MM-DD",
      }),
    otherwise: Joi.forbidden(),
  }),

  returnDate: Joi.when("journeyType", {
    is: 2,
    then: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "returnDate must be YYYY-MM-DD",
      }),
    otherwise: Joi.forbidden(),
  }),

  // MULTI-CITY
  segments: Joi.when("journeyType", {
    is: 3,
    then: Joi.array()
      .items(
        Joi.object({
          origin: Joi.string().length(3).required(),
          destination: Joi.string().length(3).required(),
          departureDate: Joi.string()
            .pattern(/^\d{4}-\d{2}-\d{2}$/)
            .required()
            .messages({
              "string.pattern.base": "segment departureDate must be YYYY-MM-DD",
            }),
        }),
      )
      .min(2)
      .required(),
    otherwise: Joi.forbidden(),
  }),

  adults: Joi.number().min(1).required(),
  children: Joi.number().min(0).default(0),
  infants: Joi.number().min(0).default(0),

  cabinClass: Joi.string()
    .valid("economy", "business", "first")
    .default("economy"),

  directFlight: Joi.boolean().default(false),
  oneStop: Joi.boolean().default(false),
});

// Other validations
const fareQuote = Joi.object({
  traceId: Joi.string().required(),
  resultIndex: Joi.string().required(),
});

const searchHotel = Joi.object({
  checkInDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "checkInDate must be YYYY-MM-DD",
    }),

  checkOutDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "checkOutDate must be YYYY-MM-DD",
    }),

  cityId: Joi.string().required(),

  noOfRooms: Joi.number().min(1).default(1),

  currency: Joi.string().default("INR"),

  nationality: Joi.string().length(2).default("IN"),

  roomGuests: Joi.array()
    .items(
      Joi.object({
        NoOfAdults: Joi.number().min(1).required(),
        NoOfChild: Joi.number().min(0).default(0),
        ChildAge: Joi.array().items(Joi.number()).default([]),
      }),
    )
    .min(1)
    .required(),
});

const ticketFlight = Joi.object({
  bookingId: Joi.string().required(),
  pnr: Joi.string().required(),
});

const fareUpsell = Joi.object({
  traceId: Joi.string().required(),
  resultIndex: Joi.string().required(),
});

const fareRule = Joi.object({
  traceId: Joi.string().required(),
  resultIndex: Joi.string().required(),
});

module.exports = {
  createBooking,
  approverAction,
  confirmBooking,
  searchFlights,
  fareQuote,
  searchHotel,
  ssr,
  seatSSR,
  mealSSR,
  baggageSSR,
  bookFlight,
  ticketFlight,
  fareUpsell,
  fareRule,
};
