const mongoose = require("mongoose");

/* ─────────────────────────────
   SUB SCHEMAS
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

const flightReissueRequestSchema = new mongoose.Schema(
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

    reissueId: {
      type: String,
      unique: true,
      index: true,
    },

    /* STATUS */
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
      default: "PENDING",
      index: true,
    },

    reissueType: {
      type: String,
      enum: ["FULL_JOURNEY", "PARTIAL_JOURNEY"],
      required: true,
    },

    /* CORPORATE */
    corporate: {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Corporate",
      },
      companyName: String,
      employeeId: String,
      employeeName: String,
      employeeEmail: String,
    },

    /* BOOKING SNAPSHOT */
    bookingSnapshot: {
      journeyType: String,
      airline: String,
      pnr: String,
      totalFare: Number,
      travelDate: Date,
    },

    /* SELECTED SEGMENTS FOR REISSUE */
    segments: {
      type: [sectorSchema],
      default: [],
    },

    /* PASSENGERS */
    passengers: {
      type: [passengerSchema],
      default: [],
    },

    /* USER (Requester) */
    user: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: String,
      email: String,
    },

    /* REQUEST DETAILS */
    reason: {
      type: String,
      required: true,
      trim: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    /* RESOLUTION / EXECUTION */
    resolution: {
      actionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      actionByName: String,
      actionAt: Date,
      message: String,
      apiResponse: mongoose.Schema.Types.Mixed,
      changeRequestId: String,
    },

    /* OPS ASSIGNMENT */
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OpsMember",
      index: true,
    },
    assignedAt: Date,
    assignmentMethod: {
      type: String,
      enum: ["AUTO", "MANUAL"],
      default: "AUTO",
    },
    assignmentSequence: Number, // Round-robin sequence number

    /* PREFERRED TIME SUPPORT */
    preferredTime: String, // e.g., "08:00 AM", "Morning", "Afternoon", "Evening", "Night"
    preferredTimeSlot: {
      type: String,
      enum: ["MORNING", "AFTERNOON", "EVENING", "NIGHT"],
    },

    /* LOGS */
    logs: {
      type: [logSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

/* ─────────────────────────────
   MODEL EXPORT
───────────────────────────── */

module.exports =
  mongoose.models.FlightReissueRequest ||
  mongoose.model("FlightReissueRequest", flightReissueRequestSchema);
