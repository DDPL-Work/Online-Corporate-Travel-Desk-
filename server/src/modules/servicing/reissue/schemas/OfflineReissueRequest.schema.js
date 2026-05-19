const mongoose = require("mongoose");
const { OFFLINE_STATUSES, BILLING_MODES } = require("../constants/reissue.constants");

const timelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(OFFLINE_STATUSES),
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    title: { type: String, required: true },
    description: String,
    actorId: mongoose.Schema.Types.ObjectId,
    actorRole: String,
    at: {
      type: Date,
      default: Date.now,
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { _id: false },
);

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actorId: mongoose.Schema.Types.ObjectId,
    actorRole: String,
    message: String,
    at: { type: Date, default: Date.now },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { _id: false },
);

const offlineReissueRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true,
      index: true,
    },
    pnr: {
      type: String,
      index: true,
    },
    originalPnr: {
      type: String,
      index: true,
    },
    airline: String,
    preferredDate: Date,
    preferredJourney: {
      searchId: String,
      resultIndex: mongoose.Schema.Types.Mixed,
      departureDate: Date,
      returnDate: Date,
      origin: String,
      destination: String,
      airlineCode: String,
      airlineName: String,
      flightNumber: String,
      cabinClass: String,
      fare: Number,
      offeredFare: Number,
      oldFare: Number,
      newFare: Number,
      fareDifference: Number,
      reissueCharge: Number,
      totalEstimate: Number,
      refundEstimate: Number,
      currency: String,
      departureTime: Date,
      arrivalTime: Date,
      duration: String,
      stops: Number,
      segments: mongoose.Schema.Types.Mixed,
      pricingBreakdown: mongoose.Schema.Types.Mixed,
      pricingSnapshot: mongoose.Schema.Types.Mixed,
      metadata: mongoose.Schema.Types.Mixed,
    },
    selectedFlight: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    selectedSegments: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    remarks: String,
    status: {
      type: String,
      enum: Object.values(OFFLINE_STATUSES),
      required: true,
      default: OFFLINE_STATUSES.RAISED,
      index: true,
    },
    assignedOpsMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OpsMember",
      index: true,
      default: null,
    },
    assignedAt: Date,
    assignmentMethod: {
      type: String,
      enum: ["ROUND_ROBIN", "MANUAL"],
      default: "ROUND_ROBIN",
    },
    assignmentHistory: [
      {
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "OpsMember",
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        mode: {
          type: String,
          enum: ["ROUND_ROBIN", "MANUAL"],
          required: true,
        },
        remarks: String,
        assignedAt: Date,
      },
    ],
    opsRemarks: [
      {
        message: String,
        by: mongoose.Schema.Types.ObjectId,
        byRole: String,
        at: { type: Date, default: Date.now },
      },
    ],
    reissuedTicketUrl: String,
    generatedTicketUrl: String,
    generatedTicketPath: String,
    generatedTicketFileName: String,
    generatedAt: Date,
    generatedBy: mongoose.Schema.Types.ObjectId,
    reissueHistory: [
      {
        requestId: mongoose.Schema.Types.ObjectId,
        oldFlight: mongoose.Schema.Types.Mixed,
        newFlight: mongoose.Schema.Types.Mixed,
        fareDifference: Number,
        reissueCharge: Number,
        totalCollection: Number,
        reissuedAt: Date,
        reissuedBy: mongoose.Schema.Types.ObjectId,
        ticketNumber: String,
        pdfUrl: String,
      },
    ],
    billingMode: {
      type: String,
      enum: Object.values(BILLING_MODES),
      index: true,
    },
    reissueCharges: {
      type: Number,
      default: 0,
    },
    fareDifference: {
      type: Number,
      default: 0,
    },
    totalAdjustment: {
      type: Number,
      default: 0,
    },
    reissuePricingSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    billingReservation: mongoose.Schema.Types.Mixed,
    walletAdjustment: mongoose.Schema.Types.Mixed,
    creditAdjustment: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
    correlationId: {
      type: String,
      index: true,
    },
    timeline: {
      type: [timelineSchema],
      default: [],
    },
    auditLogs: {
      type: [auditLogSchema],
      default: [],
    },
    completedAt: Date,
    failedAt: Date,
    rejectedAt: Date,
    slaDeadline: Date,
    firstResponseAt: Date,
    overdue: {
      type: Boolean,
      default: false,
      index: true,
    },
    breached: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

offlineReissueRequestSchema.index({ corporateId: 1, status: 1, createdAt: -1 });
offlineReissueRequestSchema.index({ employeeId: 1, createdAt: -1 });
offlineReissueRequestSchema.index({ assignedOpsMember: 1, status: 1, createdAt: -1 });
offlineReissueRequestSchema.index({ bookingId: 1, createdAt: -1 });
offlineReissueRequestSchema.index({ status: 1, overdue: 1, breached: 1, slaDeadline: 1 });
offlineReissueRequestSchema.index({ originalPnr: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.OfflineReissueRequest ||
  mongoose.model("OfflineReissueRequest", offlineReissueRequestSchema);
