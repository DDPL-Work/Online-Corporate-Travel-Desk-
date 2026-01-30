const mongoose = require("mongoose");

const bookingRequestSchema = new mongoose.Schema(
  {
    /* ================= CORE ================= */

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

    /* ================= REQUEST STATUS ================= */

    requestStatus: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected", "expired"],
      default: "draft",
      index: true,
    },

    /* ================= APPROVER DETAILS ================= */

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: Date,

    approverComments: String,

    /* ================= REQUEST INFO ================= */

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
        phoneWithCode: String,
        dateOfBirth: Date,
        gender: String,
        passportNumber: String,
        passportExpiry: Date,
        nationality: String,
        isLeadPassenger: Boolean,
      },
    ],

    /* ================= FLIGHT REQUEST (FULL DATA) ================= */

    flightRequest: {
      type: mongoose.Schema.Types.Mixed, // 🔥 FULL PROVIDER PAYLOAD
    },

    /* ================= PRICING ================= */

    pricingSnapshot: {
      totalAmount: Number,
      currency: { type: String, default: "INR" },
      capturedAt: Date,
    },

    /* ================= EXECUTION ================= */

    executionStatus: {
      type: String,
      enum: [
        "not_started",
        "booking_initiated",
        "booked",
        "ticket_pending",
        "ticketed",
        "failed",
      ],
      default: "not_started",
      index: true,
    },

    bookingResult: {
      pnr: String,
      ticketNumbers: [String],
      providerBookingId: String,
      providerResponse: mongoose.Schema.Types.Mixed,
    },

    /* ================= PAYMENT ================= */

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

    /* ================= BOOKING SUMMARY ================= */

    bookingSnapshot: {
      sectors: [String],
      airline: String,
      travelDate: String,
      returnDate: String,
      cabinClass: {
        type: String,
        enum: ["Economy", "Premium Economy", "Business", "First"],
        index: true,
      },
      amount: Number,
      purposeOfTravel: String,
      city: String,
    },

    /* ================= DOCUMENTS ================= */

    documents: {
      ticketUrl: String,
      invoiceUrl: String,
      voucherUrl: String,
    },

    /* ================= CANCELLATION ================= */

    cancellation: {
      cancelledAt: Date,
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: String,
      refundAmount: Number,
      refundStatus: String,
    },
  },
  { timestamps: true },
);

/* ======================================================
   🔒 GUARDS & BUSINESS RULES
====================================================== */

/* 1️⃣ Prevent payment before approval */
bookingRequestSchema.pre("save", function () {
  if (
    this.requestStatus === "pending_approval" &&
    this.payment &&
    this.payment.method
  ) {
    throw new Error("Payment not allowed before approval");
  }
});

/* 2️⃣ Enforce status transitions */
const ALLOWED_STATUS_TRANSITIONS = {
  draft: ["pending_approval"],
  pending_approval: ["approved", "rejected"],
  approved: [],
  rejected: [],
  expired: [],
};

bookingRequestSchema.pre("save", function () {
  if (!this.isModified("requestStatus")) return;

  const previousStatus = this.$locals.previousStatus || "draft";
  const nextStatus = this.requestStatus;

  if (!ALLOWED_STATUS_TRANSITIONS[previousStatus]?.includes(nextStatus)) {
    throw new Error(
      `Invalid request status transition: ${previousStatus} → ${nextStatus}`,
    );
  }
});

/* 3️⃣ Freeze data after approval */
bookingRequestSchema.pre("save", function () {
  if (this.requestStatus !== "approved") return;

  const immutableFields = [
    "flightRequest",
    "pricingSnapshot",
    "travellers",
    "priority",
  ];

  for (const field of immutableFields) {
    if (this.isModified(field)) {
      throw new Error(`${field} cannot be modified after approval`);
    }
  }
});

/* 4️⃣ Prevent execution before approval */
bookingRequestSchema.pre("save", function () {
  if (
    this.isModified("executionStatus") &&
    this.executionStatus !== "not_started" &&
    this.requestStatus !== "approved"
  ) {
    throw new Error("Execution cannot start before approval");
  }
});

/* ======================================================
   ⚡ INDEXES
====================================================== */

bookingRequestSchema.index({ corporateId: 1, requestStatus: 1 });
bookingRequestSchema.index({ corporateId: 1, createdAt: -1 });
bookingRequestSchema.index({ approvedBy: 1 });
bookingRequestSchema.index({ rejectedBy: 1 });
bookingRequestSchema.index({ executionStatus: 1 });

module.exports = mongoose.model("BookingRequest", bookingRequestSchema);
