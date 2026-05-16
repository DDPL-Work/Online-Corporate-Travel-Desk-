const mongoose = require("mongoose");

const walletRechargeLogSchema = new mongoose.Schema(
  {
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true,
      index: true,
    },

    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    gateway: {
      type: String,
      enum: ["razorpay", "phonepe"],
      default: "razorpay",
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      required: true,
      index: true,
    },

    orderId: {
      type: String,
      index: true,
    },

    paymentId: {
      type: String,
      index: true,
    },

    providerOrderId: {
      type: String,
      index: true,
    },

    lastKnownState: {
      type: String,
      trim: true,
    },

    failureReason: {
      type: String,
    },

    balanceBefore: Number,
    balanceAfter: Number,
    processedAt: Date,
    webhookReceivedAt: Date,
    lastStatusCheckAt: Date,

    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

walletRechargeLogSchema.index({ createdAt: -1 });
walletRechargeLogSchema.index({ corporateId: 1, createdAt: -1 });
walletRechargeLogSchema.index({ gateway: 1, orderId: 1 });
walletRechargeLogSchema.index({ gateway: 1, paymentId: 1 });

module.exports = mongoose.model(
  "WalletRechargeLog",
  walletRechargeLogSchema
);
