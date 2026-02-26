const mongoose = require("mongoose");

const hotelBookingRequestSchema = new mongoose.Schema(
  {
    /* ================= CORE ================= */

    bookingReference: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* ================= APPROVAL ================= */

    requestStatus: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected", "expired"],
      default: "draft",
      index: true,
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,

    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: Date,

    approverComments: String,

    purposeOfTravel: {
      type: String,
      required: true,
    },

    travellers: [
      {
        title: String,
        firstName: String,
        lastName: String,
        email: String,
        phoneWithCode: String,
        nationality: String,
        isLeadGuest: Boolean,
      },
    ],

    /* ================= HOTEL REQUEST ================= */

    hotelRequest: {
      cityId: String,
      cityName: String,
      countryCode: String,

      checkInDate: Date,
      checkOutDate: Date,
      noOfNights: Number,
      noOfRooms: Number,

      roomGuests: [
        {
          noOfAdults: Number,
          noOfChild: Number,
          childAge: [Number],
        },
      ],

      preferredCurrency: {
        type: String,
        default: "INR",
      },

      guestNationality: {
        type: String,
        default: "IN",
      },

      selectedHotel: {
        hotelCode: String,
        hotelName: String,
        starRating: Number,
        address: String,
        city: String,
        country: String,
      },

      selectedRoom: {
        roomIndex: String,
        roomTypeName: String,
        ratePlanName: String,
        cancellationPolicy: String,
        mealPlan: String,
        price: Number,
        currency: String,
      },

      providerTraceId: String,
      providerSearchResponse: mongoose.Schema.Types.Mixed,
      providerRoomInfoResponse: mongoose.Schema.Types.Mixed,
    },

    /* ================= PRICING ================= */

    pricingSnapshot: {
      totalAmount: Number,
      currency: { type: String, default: "INR" },
      capturedAt: Date,
    },

    /* ================= EXECUTION ================= */

    executionStatus: {
      type: String,
      enum: [
        "not_started",
        "booking_initiated",
        "booked",
        "voucher_generated",
        "failed",
      ],
      default: "not_started",
      index: true,
    },

    bookingResult: {
      hotelBookingId: String,
      confirmationNumber: String,
      providerBookingId: String,
      providerResponse: mongoose.Schema.Types.Mixed,
    },

    /* ================= PAYMENT ================= */

    payment: {
      method: {
        type: String,
        enum: ["wallet", "gateway", "postpaid"],
      },
      transactionId: String,
      paidAt: Date,
      status: {
        type: String,
        enum: ["pending", "completed", "failed"],
      },
    },

    /* ================= SNAPSHOT ================= */

    bookingSnapshot: {
      hotelName: String,
      city: String,
      checkInDate: Date,
      checkOutDate: Date,
      roomCount: Number,
      nights: Number,
      amount: Number,
      currency: { type: String, default: "INR" },
    },

    /* ================= DOCUMENTS ================= */

    documents: {
      voucherUrl: String,
      invoiceUrl: String,
    },

    /* ================= CANCELLATION ================= */

    cancellation: {
      cancelledAt: Date,
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: String,
      refundAmount: Number,
      refundStatus: String,
    },
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

hotelBookingRequestSchema.index({ corporateId: 1, requestStatus: 1 });
hotelBookingRequestSchema.index({ corporateId: 1, createdAt: -1 });
hotelBookingRequestSchema.index({ executionStatus: 1 });

module.exports = mongoose.model(
  "HotelBookingRequest",
  hotelBookingRequestSchema
);
