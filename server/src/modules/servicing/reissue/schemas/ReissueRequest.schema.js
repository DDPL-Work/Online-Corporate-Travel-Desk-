const mongoose = require("mongoose");
const {
  REISSUE_MODES,
  REISSUE_STATUSES,
  REISSUE_TYPES,
  BILLING_MODES,
  PROVIDERS,
} = require("../constants/reissue.constants");

const fileSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    fileName: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    uploadedAt: Date,
  },
  { _id: false },
);

const timelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(REISSUE_STATUSES),
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

const notificationLogSchema = new mongoose.Schema(
  {
    event: String,
    channel: {
      type: String,
      enum: ["firebase", "inapp", "email"],
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    message: String,
    sentAt: Date,
  },
  { _id: false },
);

const reissueRequestSchema = new mongoose.Schema(
  {
    reissueId: {
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
    originalBookingId: {
      type: String,
      index: true,
    },
    originalPnr: String,
    newBookingId: String,
    newPnr: String,
    userId: {
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
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true,
      index: true,
    },
    supplier: String,
    airline: String,
    provider: {
      type: String,
      enum: Object.values(PROVIDERS),
      default: PROVIDERS.TBO,
      index: true,
    },
    mode: {
      type: String,
      enum: Object.values(REISSUE_MODES),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(REISSUE_STATUSES),
      required: true,
      default: REISSUE_STATUSES.CREATED,
      index: true,
    },
    reissueType: {
      type: String,
      enum: Object.values(REISSUE_TYPES),
      default: REISSUE_TYPES.FULL_REISSUE,
    },
    supplierSupport: {
      onlineReissue: { type: Boolean, default: false },
      ndc: { type: Boolean, default: false },
      onlineRefundAllowed: { type: Boolean, default: false },
      manualRestriction: { type: Boolean, default: false },
      supplierRestriction: { type: Boolean, default: false },
      groupBooking: { type: Boolean, default: false },
      partiallyUsedTicket: { type: Boolean, default: false },
    },
    oldJourney: mongoose.Schema.Types.Mixed,
    newJourney: mongoose.Schema.Types.Mixed,
    fareDifference: {
      type: Number,
      default: 0,
    },
    reissueCharges: {
      type: Number,
      default: 0,
    },
    totalAdjustment: {
      type: Number,
      default: 0,
    },
    billingMode: {
      type: String,
      enum: Object.values(BILLING_MODES),
      required: true,
      index: true,
    },
    billingReservation: {
      reservationId: String,
      idempotencyKey: String,
      status: {
        type: String,
        enum: ["not_required", "reserved", "finalized", "released", "failed"],
        default: "not_required",
      },
      amount: Number,
      createdAt: Date,
      finalizedAt: Date,
      releasedAt: Date,
      failureReason: String,
      metadata: mongoose.Schema.Types.Mixed,
    },
    walletAdjustment: mongoose.Schema.Types.Mixed,
    creditAdjustment: mongoose.Schema.Types.Mixed,
    opsRemarks: [
      {
        message: String,
        by: mongoose.Schema.Types.ObjectId,
        byRole: String,
        at: { type: Date, default: Date.now },
      },
    ],
    uploadedTicket: fileSchema,
    uploadedInvoice: fileSchema,
    revisedTicket: mongoose.Schema.Types.Mixed,
    revisedInvoice: mongoose.Schema.Types.Mixed,
    ticketData: mongoose.Schema.Types.Mixed,
    miniFareRules: mongoose.Schema.Types.Mixed,
    supplierResponse: mongoose.Schema.Types.Mixed,
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
    notificationLogs: {
      type: [notificationLogSchema],
      default: [],
    },
    assignedOpsUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OpsMember",
      index: true,
    },
    assignedAt: Date,
    completedAt: Date,
    failedAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
    strict: true,
  },
);

reissueRequestSchema.index({ corporateId: 1, status: 1, createdAt: -1 });
reissueRequestSchema.index({ userId: 1, createdAt: -1 });
reissueRequestSchema.index({ assignedOpsUserId: 1, status: 1, createdAt: -1 });
reissueRequestSchema.index({ bookingId: 1, createdAt: -1 });

module.exports =
  mongoose.models.ReissueRequest ||
  mongoose.model("ReissueRequest", reissueRequestSchema);
