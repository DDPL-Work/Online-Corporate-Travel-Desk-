const mongoose = require("mongoose");

const bookingMarkupAuditSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    orderId: {
      type: String,
      index: true
    },
    bookingReference: {
      type: String
    },
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true,
      index: true
    },
    corporateName: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    },
    productType: {
      type: String,
      enum: ["flight", "hotel"],
      required: true
    },
    bookingStatus: {
      type: String
    },
    supplier: {
      type: String
    },
    supplierBookingId: {
      type: String
    },
    pnr: {
      type: String
    },
    ticketNumbers: [String],
    bookingDate: {
      type: Date,
      required: true,
      index: true
    },
    travelDate: {
      type: Date,
      index: true
    },

    routeDetails: {
      origin: String,
      destination: String,
      sectors: [String],
      journeyType: String
    },

    airlineDetails: {
      airlineCode: String,
      airlineName: String,
      flightNumbers: [String],
      cabinClass: String
    },

    passengerDetails: {
      totalPassengers: { type: Number, default: 0 },
      adults: { type: Number, default: 0 },
      children: { type: Number, default: 0 },
      infants: { type: Number, default: 0 }
    },

    fareBeforeMarkup: {
      supplierFare: { type: Number, default: 0 },
      baseFare: { type: Number, default: 0 },
      taxes: { type: Number, default: 0 },
      supplierPublishedFare: { type: Number, default: 0 }
    },

    fareAfterMarkup: {
      finalFare: { type: Number, default: 0 },
      markupAmount: { type: Number, default: 0 },
      publishedFare: { type: Number, default: 0 }
    },

    earnings: {
      totalMarkupEarned: { type: Number, default: 0 },
      profitGenerated: { type: Number, default: 0 } // if applicable
    },

    appliedMarkupRules: [
      {
        ruleId: mongoose.Schema.Types.ObjectId,
        category: String,
        markupMethod: String,
        markupValue: Number,
        markupAmount: Number,
        refundPolicy: String
      }
    ],

    markupSnapshot: {
      type: mongoose.Schema.Types.Mixed
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

// Prevent duplicate audit per booking (if strict 1:1 is required)
bookingMarkupAuditSchema.index({ bookingId: 1 }, { unique: true });

const BookingMarkupAudit = mongoose.models.BookingMarkupAudit || mongoose.model("BookingMarkupAudit", bookingMarkupAuditSchema);

module.exports = BookingMarkupAudit;
