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
    creationSource: {
      type: creationSourceSchema,
      default: () => ({
        type: "USER_SUBMITTED",
        trigger: null,
        createdBy: null,
        workflow: null,
      }),
    },
    status: {
      type: String,
      enum: Object.values(OFFLINE_STATUSES),
      required: true,
      default: OFFLINE_STATUSES.PENDING_ASSIGNMENT,
      index: true,
    },
    assignmentStatus: {
      type: String,
      enum: ["UNASSIGNED", "ASSIGNED"],
      default: "UNASSIGNED",
      index: true,
    },
    autoAssignmentAttempted: {
      type: Boolean,
      default: false,
    },
    assignmentFailureReason: {
      type: String,
      default: null,
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
     * Populated at request creation and updated after ticket generation.
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
    isReissueLocked: {
      type: Boolean,
      default: false,
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
offlineReissueRequestSchema.index({ assignmentStatus: 1, status: 1, createdAt: -1 });
offlineReissueRequestSchema.index({ bookingId: 1, createdAt: -1 });
offlineReissueRequestSchema.index({ status: 1, overdue: 1, breached: 1, slaDeadline: 1 });
offlineReissueRequestSchema.index({ originalPnr: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.OfflineReissueRequest ||
  mongoose.model("OfflineReissueRequest", offlineReissueRequestSchema);
