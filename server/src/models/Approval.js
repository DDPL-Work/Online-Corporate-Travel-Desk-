const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema(
  {
    /* ================= REFERENCES ================= */

    bookingRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      index: true,
    },

    approvalReference: {
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

    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    /* ================= APPROVAL STATE ================= */

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired", "cancelled"],
      default: "pending",
      index: true,
    },

    requesterComments: String,
    approverComments: String,

    approvedAt: Date,
    rejectedAt: Date,
    expiredAt: Date,

    /* ================= FULL BOOKING REQUEST SNAPSHOT ================= */

    bookingReference: String,

    bookingType: {
      type: String,
      enum: ["flight", "hotel"],
      required: true,
    },

    purposeOfTravel: String,

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

    /* ================= FLIGHT SNAPSHOT ================= */

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
        seats: mongoose.Schema.Types.Mixed,
        meals: mongoose.Schema.Types.Mixed,
        baggage: mongoose.Schema.Types.Mixed,
      },

      fareExpiry: Date,
    },

    /* ================= PRICING SNAPSHOT ================= */

    pricingSnapshot: {
      totalAmount: Number,
      currency: String,
      capturedAt: Date,
    },

    /* ================= LIGHTWEIGHT ADMIN SNAPSHOT ================= */

    bookingSnapshot: {
      sectors: [String],
      airline: String,
      travelDate: Date,
      returnDate: Date,
      amount: Number,
      city: String,
      purposeOfTravel: String,
    },

    /* ================= POLICY SNAPSHOT ================= */

    policySnapshot: {
      policyType: String,
      maxAllowedAmount: Number,
      violationFlags: [String],
    },

    /* ================= NOTIFICATION ================= */

    notification: {
      initialSent: { type: Boolean, default: false },
      remindersSent: { type: Number, default: 0 },
      lastReminderAt: Date,
    },
  },
  { timestamps: true }
);

/* ================= METHODS ================= */

approvalSchema.methods.approve = function (comments = "") {
  this.status = "approved";
  this.approverComments = comments;
  this.approvedAt = new Date();
  return this.save();
};

approvalSchema.methods.reject = function (comments = "") {
  this.status = "rejected";
  this.approverComments = comments;
  this.rejectedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Approval", approvalSchema);
