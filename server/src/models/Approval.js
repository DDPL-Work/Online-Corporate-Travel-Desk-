const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema(
  {
    /* ================= REFERENCES ================= */

    // bookingRequestId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "BookingRequest",
    //   index: true,
    //   required: true,
    // },

    bookingRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "bookingRequestModel",
      index: true,
    },

    bookingRequestModel: {
      type: String,
      required: true,
      enum: ["BookingRequest", "HotelBookingRequest"],
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
      required: true,
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

    /* ================= FULL SNAPSHOT ================= */

    bookingRequestSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
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
  { timestamps: true },
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

approvalSchema.pre("save", function () {
  if (!this.isNew && this.isModified("bookingRequestSnapshot")) {
    throw new Error("Approval snapshot is immutable");
  }
});

module.exports = mongoose.model("Approval", approvalSchema);
