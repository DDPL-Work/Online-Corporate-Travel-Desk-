const mongoose = require("mongoose");

/* ─────────────────────────────
   SUB SCHEMAS (IMPORTANT FIX)
───────────────────────────── */

const passengerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    type: { type: String, trim: true },
    ticketNumber: { type: String, trim: true },
  },
  { _id: false }
);

const sectorSchema = new mongoose.Schema(
  {
    origin: String,
    destination: String,
    departureTime: Date,
    arrivalTime: Date,
    airline: String,
    flightNumber: String,
  },
  { _id: false }
);

const logSchema = new mongoose.Schema(
  {
    action: String,
    by: String,
    message: String,
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/* ─────────────────────────────
   MAIN SCHEMA
───────────────────────────── */

const cancellationQuerySchema = new mongoose.Schema(
  {
    /* CORE */
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    bookingReference: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    queryId: {
      type: String,
      unique: true,
      index: true,
    },

    /* STATUS */
    type: {
      type: String,
      enum: ["CANCELLATION_REQUEST"],
      default: "CANCELLATION_REQUEST",
    },

    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"],
      default: "OPEN",
      index: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },

    /* CORPORATE */
    corporate: {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
      companyName: String,
      employeeId: String,
      employeeName: String,
      employeeEmail: String,
    },

    /* BOOKING SNAPSHOT */
    bookingSnapshot: {
      journeyType: {
        type: String,
        enum: ["ONE_WAY", "ROUND_TRIP"],
      },

      travelDate: Date,
      returnDate: Date,

      totalFare: Number,
      baseFare: Number,
      taxes: Number,
      serviceFee: Number,

      currency: {
        type: String,
        default: "INR",
      },

      airline: String,
      pnr: String,

      sectors: [sectorSchema], // ✅ FIXED
    },

    /* PASSENGERS (🔥 CRITICAL FIX) */
    passengers: {
      type: [passengerSchema], // ✅ STRICT TYPE
      default: [],
    },

    /* USER */
    user: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: String,
      email: String,
      phone: String,
    },

    /* REQUEST */
    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    /* RESOLUTION */
    resolution: {
      message: String,
      resolvedAt: Date,
      refundAmount: Number,
      cancellationCharge: Number,
      creditNoteNo: String,
    },

    /* LOGS */
    logs: {
      type: [logSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true, // 🔥 IMPORTANT
  }
);

/* ─────────────────────────────
   MODEL EXPORT (SAFE)
───────────────────────────── */

module.exports =
  mongoose.models.CancellationQuery ||
  mongoose.model("CancellationQuery", cancellationQuerySchema);