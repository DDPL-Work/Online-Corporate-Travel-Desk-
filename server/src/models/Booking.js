const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      unique: true,
      index: true,
    },

    corporate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["flight", "hotel"],
      required: true,
    },

    provider: {
      type: String, // TekTravels / Amadeus / Sabre / Internal
      default: "TekTravels",
    },

    // Important for TBO flow
    traceId: {
      type: String,
      index: true,
    },

    requestData: mongoose.Schema.Types.Mixed, // Search/booking request snapshot
    responseData: mongoose.Schema.Types.Mixed, // Supplier booking response

    pricing: {
      total: { type: Number, default: 0 },
      baseFare: Number,
      taxes: Number,
      currency: { type: String, default: "INR" },
    },

    status: {
      type: String,
      enum: ["requested", "approved", "booked", "cancelled", "completed"],
      default: "requested",
      index: true,
    },

    statusTimestamps: {
      requestedAt: { type: Date, default: Date.now },
      approvedAt: Date,
      bookedAt: Date,
      cancelledAt: Date,
      completedAt: Date,
    },

    approvers: [
      {
        approver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        action: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        comment: String,
        actedAt: Date,
      },
    ],

    // Voucher PDF URL
    voucherUrl: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// --------------------------------------------------
// AUTO GENERATE BOOKING REFERENCE
// --------------------------------------------------
BookingSchema.pre("save", async function (next) {
  if (!this.bookingRef) {
    const prefix = process.env.BOOKING_REFERENCE_PREFIX || "BKTD";
    this.bookingRef = `${prefix}-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
  }
  next();
});

module.exports = mongoose.model("Booking", BookingSchema);
