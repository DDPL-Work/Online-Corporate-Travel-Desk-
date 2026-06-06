const mongoose = require("mongoose");

const markupRevenueSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    orderId: {
      type: String,
      required: true,
      index: true
    },
    bookingReference: {
      type: String,
      index: true
    },
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    corporateName: {
      type: String
    },
    productType: {
      type: String,
      enum: ["flight", "hotel"],
      required: true,
      index: true
    },
    bookingDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    travelDate: {
      type: Date
    },
    supplier: {
      type: String
    },
    
    // Revenue tracking
    supplierFare: {
      type: Number,
      required: true,
      default: 0
    },
    finalFare: {
      type: Number,
      required: true,
      default: 0
    },
    totalMarkup: {
      type: Number,
      required: true,
      default: 0
    },
    netRevenue: {
      type: Number,
      required: true,
      default: 0
    },
    revenueStatus: {
      type: String,
      enum: ["PENDING", "EARNED", "REFUNDED", "ADJUSTED"],
      default: "EARNED",
      index: true
    },
    
    markupBreakdown: [
      {
        ruleId: { type: mongoose.Schema.Types.ObjectId },
        category: String,
        markupMethod: String,
        markupValue: Number,
        markupAmount: Number,
        refundPolicy: String
      }
    ],

    routeSummary: {
      origin: String,
      destination: String,
      journeyType: String
    },
    airlineSummary: {
      airlineCode: String,
      airlineName: String
    },

    // Future support
    reissueAdjustment: {
      adjustmentType: String,
      adjustmentAmount: Number
    },
    refundAdjustment: {
      adjustmentType: String,
      adjustmentAmount: Number
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate revenue per booking (if strict 1:1 is required)
markupRevenueSchema.index({ bookingId: 1 }, { unique: true });

const MarkupRevenue = mongoose.models.MarkupRevenue || mongoose.model("MarkupRevenue", markupRevenueSchema);

module.exports = MarkupRevenue;
