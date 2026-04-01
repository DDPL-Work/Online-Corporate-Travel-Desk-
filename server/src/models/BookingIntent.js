const mongoose = require("mongoose");

const BookingIntentSchema = new mongoose.Schema(
  {
    bookingRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      required: true,
      unique: true,
      index: true,
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
    },

    // 🔒 APPROVED PARAMETERS
    origin: String,
    destination: String,

    travelDate: Date,
    returnDate: Date,

    cabinClass: {
      type: String,
      enum: ["Economy", "Premium Economy", "Business", "First"],
      required: true,
    },

    airlineCodes: [String], // AI, UK, 6E etc

    maxApprovedPrice: {
      type: Number,
      required: true,
    },

    approvalStatus: {
      type: String,
      enum: ["approved", "expired"],
      default: "approved",
      index: true,
    },

    approvedAt: Date,

    validUntil: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BookingIntent", BookingIntentSchema);
