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

    failureReason: {
      type: String,
    },

    balanceBefore: Number,
    balanceAfter: Number,

    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

walletRechargeLogSchema.index({ createdAt: -1 });
walletRechargeLogSchema.index({ corporateId: 1, createdAt: -1 });

module.exports = mongoose.model(
  "WalletRechargeLog",
  walletRechargeLogSchema
);
