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

const creationSourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["USER_SUBMITTED", "AUTO_GENERATED"],
      default: "USER_SUBMITTED",
    },
    trigger: { type: String, default: null },
    createdBy: { type: String, default: null },
    workflow: { type: String, default: null },
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
    creationSource: {
      type: creationSourceSchema,
      default: () => ({
        type: "USER_SUBMITTED",
        trigger: null,
        createdBy: null,
        workflow: null,
      }),
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
    normalizedPricing: {
      reissuePenalty: { type: Number, default: 0 },
      newFlightBase: { type: Number, default: 0 },
      newSSRTotal: { type: Number, default: 0 },
      reusablePreviousValue: { type: Number, default: 0 },
      netPayable: { type: Number, default: 0 },
    },
    /**
     * activeTicketSnapshot — single source of truth for the last successfully
     * ticketed booking state across all reissue cycles.
     * Populated at request creation and updated after each confirmed reissue.
     */
    activeTicketSnapshot: {
      pnr: { type: String, default: null },
      supplierBookingId: { type: String, default: null },
      segments: { type: mongoose.Schema.Types.Mixed, default: [] },
      fareSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
      ssrSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
      ssr: { type: mongoose.Schema.Types.Mixed, default: null },
      ticketData: { type: mongoose.Schema.Types.Mixed, default: null },
      revisedTicket: { type: mongoose.Schema.Types.Mixed, default: null },
      revisedInvoice: { type: mongoose.Schema.Types.Mixed, default: null },
      capturedAt: { type: Date, default: null },
      sourceBookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BookingRequest",
        default: null,
      },
    },
    bookingLineage: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastTicketedSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ssrFinancials: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    financialLedger: {
      originalTicketAmount: { type: Number, default: 0 },
      originalSSR: { type: Number, default: 0 },
      cumulativeReissueCharges: { type: Number, default: 0 },
      cumulativeSSR: { type: Number, default: 0 },
      cumulativeCollections: { type: Number, default: 0 },
      cumulativeRefunds: { type: Number, default: 0 },
      totalNetPaid: { type: Number, default: 0 },

      originalBaseFare: { type: Number, default: 0 },
      originalTaxes: { type: Number, default: 0 },
      originalSeatSSR: { type: Number, default: 0 },
      originalMealSSR: { type: Number, default: 0 },
      originalBaggageSSR: { type: Number, default: 0 },
      originalTotalPaid: { type: Number, default: 0 },
      cumulativePaid: { type: Number, default: 0 },
      cumulativeRefund: { type: Number, default: 0 },
      cumulativeCollection: { type: Number, default: 0 },
      currentTicketValue: { type: Number, default: 0 },
      currentSSRValue: { type: Number, default: 0 },
      currentTotalValue: { type: Number, default: 0 },
      lastTicketedSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
      ssrFinancials: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    pricingHistory: [
      {
        cycle: { type: Number, required: true },
        previousTotalPaid: { type: Number, default: 0 },
        oldFare: { type: Number, default: 0 },
        oldSSR: { type: Number, default: 0 },
        newFare: { type: Number, default: 0 },
        newSSR: { type: Number, default: 0 },
        reissueCharge: { type: Number, default: 0 },
        additionalCollection: { type: Number, default: 0 },
        refundAmount: { type: Number, default: 0 },
        totalPaidAfterCycle: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },

        newBaseFare: { type: Number, default: 0 },
        newTaxes: { type: Number, default: 0 },
        newSeatSSR: { type: Number, default: 0 },
        newMealSSR: { type: Number, default: 0 },
        newBaggageSSR: { type: Number, default: 0 },
        newTotal: { type: Number, default: 0 },
        reusableSSRValue: { type: Number, default: 0 },
        refundSSRValue: { type: Number, default: 0 },
        additionalSSRValue: { type: Number, default: 0 },
        airlinePenalty: { type: Number, default: 0 },
        netPayable: { type: Number, default: 0 },
      },
    ],
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
    onlineReissueContext: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
    correlationId: {
      type: String,
      index: true,
    },
    isReissueLocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* ================= UNIFIED APPROVAL FIELDS ================= */

    approvalStage: {
      type: String,
      enum: ["MANAGER", "TRAVEL_ADMIN", "TRAVEL_ADMIN_APPROVER", "EXECUTED"],
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
