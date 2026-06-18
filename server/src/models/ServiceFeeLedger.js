const mongoose = require("mongoose");

const serviceFeeLedgerSchema = new mongoose.Schema(
  {
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
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    amountDeducted: {
      type: Number,
      required: true,
      min: 0,
    },
    ruleSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "success",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster lookups
serviceFeeLedgerSchema.index({ corporateId: 1, createdAt: -1 });
serviceFeeLedgerSchema.index({ bookingId: 1, action: 1 });

module.exports = mongoose.model("ServiceFeeLedger", serviceFeeLedgerSchema);
