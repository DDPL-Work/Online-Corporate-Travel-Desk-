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

const assignmentHistorySchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OpsMember",
      default: null,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OpsMember",
      default: null,
    },
    method: {
      type: String,
      enum: ["AUTO", "MANUAL"],
      default: "AUTO",
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "assignmentHistory.assignedByModel",
      default: null,
    },
    assignedByModel: {
      type: String,
      enum: ["User", "OpsMember", "SuperAdmin"],
      default: "User",
    },
    reason: String,
    assignedAt: {
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

    bookingType: {
      type: String,
      enum: ["flight", "hotel"],
      default: "flight",
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

    /* ================= UNIFIED APPROVAL FIELDS ================= */

    approvalStage: {
      type: String,
      enum: ["MANAGER", "TRAVEL_ADMIN", "TRAVEL_ADMIN_APPROVER", "EXECUTED", "PENDING_PARALLEL_APPROVAL", "PENDING_MANAGER_APPROVAL", "MANAGER_APPROVED", "REJECTED"],
      index: true,
    },

    requestStatus: {
      type: String,
      enum: ["PENDING_MANAGER_APPROVAL", "PENDING_TRAVEL_ADMIN_APPROVAL", "PENDING_ADMIN_APPROVAL", "approved", "rejected", "transferred"],
      index: true,
    },

    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    travelAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    providerExecutionStatus: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "OPS_ASSIGNED"],
      default: "PENDING",
    },

    isOnlineCancellation: {
      type: Boolean,
      default: false,
    },

    approvalType: {
      type: String,
      enum: ["ONLINE", "OFFLINE"],
      default: "OFFLINE",
    },

    travelAdminApprovedAt: {
      type: Date,
      default: null,
    },

    managerApprovedAt: {
      type: Date,
      default: null,
    },

    travadminApprover: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      email: String,
      name: String,
      role: String,
      transferRemark: String,
      transferredAt: Date,
    },

    approvalAudit: [
      {
        action: { type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: String,
        timestamp: { type: Date, default: Date.now },
        remarks: String,
      },
    ],

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

    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      index: true,
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

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OpsMember",
      default: null,
      index: true,
    },
    assignedAt: Date,
    assignmentMethod: {
      type: String,
      enum: ["AUTO", "MANUAL"],
      default: null,
    },
    assignmentHistory: {
      type: [assignmentHistorySchema],
      default: [],
    },
    autoAssignmentAttempted: {
      type: Boolean,
      default: false,
    },
    assignmentFailureReason: {
      type: String,
      default: null,
    },
    assignmentReleasedAt: Date,
  },
  {
    timestamps: true,
    strict: true, // 🔥 IMPORTANT
  }
);

/* ─────────────────────────────
   COMPOUND INDEXES for badge/queue queries
───────────────────────────── */
cancellationQuerySchema.index({ corporateId: 1, approvalStage: 1, managerId: 1 });
cancellationQuerySchema.index({ corporateId: 1, approvalStage: 1, travelAdminId: 1 });
cancellationQuerySchema.index({ corporateId: 1, approvalStage: 1, "travadminApprover.userId": 1 });
cancellationQuerySchema.index({ approvalStage: 1, providerExecutionStatus: 1 });

/* ─────────────────────────────
   MODEL EXPORT (SAFE)
───────────────────────────── */

module.exports =
  mongoose.models.CancellationQuery ||
  mongoose.model("CancellationQuery", cancellationQuerySchema);
