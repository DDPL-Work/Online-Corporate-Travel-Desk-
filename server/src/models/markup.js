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
        airlineName: { type: String },
        airlineIcao: { type: String },
        cabinClass: { type: Number, enum: [2, 3, 4, 5, 6] },
        origin: { type: String },            
        originName: { type: String },
        originCity: { type: String },
        destination: { type: String },
        destinationName: { type: String },
        destinationCity: { type: String },
        country: { type: String },
        countryName: { type: String },
        city: { type: String },
        cityName: { type: String },
        hotelCityCode: { type: String },
        hotelCityName: { type: String },
        hotel: { type: String },
        hotelName: { type: String },
        hotelCountryCode: { type: String },
        hotelStarRating: { type: Number },
        starRating: { type: Number, enum: [1, 2, 3, 4, 5] },
        flightType: { type: String, enum: ["domestic", "international"] }
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
