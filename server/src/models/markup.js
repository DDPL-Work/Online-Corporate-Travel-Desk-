// server/src/models/markup.js
const mongoose = require("mongoose");

const fareSlabSchema = new mongoose.Schema(
  {
    from: { type: Number, required: true },
    to: { type: Number, required: true },
    method: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true }
  },
  { _id: false }
);
 
const corporateMarkupSchema = new mongoose.Schema(
  {
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true,
      index: true
    },
    productType: {
      type: String,
      enum: ["flight", "hotel"],
      required: true,
      index: true
    },
    
    rules: [{
      category: {
        type: String,
        required: true
      },
      markupMethod: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage"
      },
      markupValue: {
        type: Number
      },
      markupRefundPolicy: {
        type: String,
        enum: ["NONE", "FULL", "PROPORTIONAL"],
        default: "NONE"
      },
      fareSlabs: [fareSlabSchema],
      criteria: {
        airline: { type: String }, 
        cabinClass: { type: Number, enum: [2, 3, 4, 5, 6] },
        origin: { type: String },            
        destination: { type: String },
        country: { type: String },
        city: { type: String },
        hotelCityCode: { type: String },
        hotel: { type: String },
        starRating: { type: Number, enum: [1, 2, 3, 4, 5] }
      }
    }],

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
  }
);

// Indexes to speed up rule matching during booking operations
corporateMarkupSchema.index({ corporateId: 1, productType: 1, isActive: 1 });

const CorporateMarkup = mongoose.models.CorporateMarkup || mongoose.model("CorporateMarkup", corporateMarkupSchema);
module.exports = CorporateMarkup;
