const mongoose = require("mongoose");

const bookingRequestSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    bookingType: {
      type: String,
      enum: ["flight", "hotel"],
      required: true,
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

    /* ================= REQUEST PHASE ================= */

    requestStatus: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected", "expired"],
      default: "draft",
      index: true,
    },

    approvalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Approval",
    },

    purposeOfTravel: {
      type: String,
      required: true,
      trim: true,
    },

    travellers: [
      {
        title: String,
        firstName: String,
        lastName: String,
        email: String,
        dateOfBirth: Date,
        gender: String,
        passportNumber: String,
        passportExpiry: Date,
        nationality: String,
        isLeadPassenger: Boolean,
      },
    ],

    /* ================= FLIGHT REQUEST SNAPSHOT ================= */

    flightRequest: {
      traceId: String,
      resultIndex: String,

      segments: [
        {
          segmentIndex: Number,

          airlineCode: String,
          airlineName: String,
          flightNumber: String,
          fareClass: String,
          cabinClass: Number,
          aircraft: String,

          origin: {
            airportCode: String,
            airportName: String,
            terminal: String,
            city: String,
            country: String,
          },

          destination: {
            airportCode: String,
            airportName: String,
            terminal: String,
            city: String,
            country: String,
          },

          departureDateTime: Date,
          arrivalDateTime: Date,

          durationMinutes: Number,
          stopOver: Boolean,

          baggage: {
            checkIn: String,
            cabin: String,
          },
        },
      ],

      fareSnapshot: {
        baseFare: Number,
        tax: Number,
        publishedFare: Number,
        offeredFare: Number,
        currency: String,

        refundable: Boolean,
        fareType: String,

        miniFareRules: mongoose.Schema.Types.Mixed,
        lastTicketDate: Date,
      },

      ssrSnapshot: {
        seats: [
          {
            segmentIndex: Number,
            travelerIndex: Number,
            seatNo: String,
            price: Number,
          },
        ],
        meals: [
          {
            segmentIndex: Number,
            travelerIndex: Number,
            code: String,
            description: String,
            price: Number,
          },
        ],
        baggage: [
          {
            segmentIndex: Number,
            travelerIndex: Number,
            code: String,
            weight: String,
            price: Number,
          },
        ],
      },

      fareExpiry: Date,
    },

    pricingSnapshot: {
      totalAmount: Number,
      currency: { type: String, default: "INR" },
      capturedAt: Date,
    },

    /* ================= EXECUTION PHASE ================= */

    executionStatus: {
      type: String,
      enum: [
        "not_started",
        "booking_initiated",
        "booked",
        "ticketed",
        "failed",
      ],
      default: "not_started",
      index: true,
    },

    bookingResult: {
      pnr: String,
      ticketNumbers: [String],
      tboBookingId: String,
      tboResponse: mongoose.Schema.Types.Mixed,
    },

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

    bookingSnapshot: {
      sectors: [String],
      airline: String,
      travelDate: String,
      returnDate: String,
      amount: Number,
      purposeOfTravel: String,
      city: String,
    },

    /* ================= POST BOOKING ================= */

    documents: {
      ticketUrl: String,
      invoiceUrl: String,
      voucherUrl: String,
    },

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

/* Guards */
bookingRequestSchema.pre("save", function () {
  if (
    this.requestStatus === "pending_approval" &&
    this.payment &&
    this.payment.method
  ) {
    throw new Error("Payment not allowed before approval");
  }
});

module.exports = mongoose.model("BookingRequest", bookingRequestSchema);
