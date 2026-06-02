const mongoose = require("mongoose");

const markupRevenueSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true
    },
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true,
      index: true
    },
    serviceType: {
      type: String,
      enum: ["flight", "hotel"],
      required: true,
      index: true
    },
    markupAmount: {
      type: Number,
      required: true,
      default: 0
    },
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CorporateMarkup",
      required: false, // In case of global or fallback rules, but usually present
      index: true
    },
    bookingDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "REISSUED"],
      default: "PENDING",
      index: true
    }
  },
  {
    timestamps: true
  }
);

const MarkupRevenue = mongoose.models.MarkupRevenue || mongoose.model("MarkupRevenue", markupRevenueSchema);

module.exports = MarkupRevenue;
