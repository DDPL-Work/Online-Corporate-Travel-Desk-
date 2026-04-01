const mongoose = require("mongoose");

const hotelBookingSchema = new mongoose.Schema(
  {
    bookingReference: {
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

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    approvalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Approval",
    },

    /* ================= HOTEL CORE ================= */

    hotelName: String,
    hotelCode: String,
    starRating: Number,

    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },

    latitude: Number,
    longitude: Number,

    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },

    numberOfRooms: Number,
    numberOfNights: Number,

    roomType: String,
    ratePlanName: String,
    roomIndex: String,

    mealPlan: String,
    cancellationPolicy: String,

    guestDetails: [
      {
        title: String,
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        isLeadGuest: Boolean,
      },
    ],

    /* ================= PROVIDER ================= */

    traceId: String,
    providerBookingId: String,
    confirmationNumber: String,
    tboBookingId: String,

    providerResponse: mongoose.Schema.Types.Mixed,

    /* ================= PRICING ================= */

    pricing: {
      baseFare: Number,
      taxes: Number,
      totalAmount: Number,
      currency: { type: String, default: "INR" },
      commission: Number,
    },

    /* ================= PAYMENT ================= */

    payment: {
      method: {
        type: String,
        enum: ["wallet", "gateway", "postpaid"],
      },
      transactionId: String,
      paidAt: Date,
      status: {
        type: String,
        enum: ["pending", "completed", "failed", "refunded"],
      },
    },

    /* ================= STATUS ================= */

    status: {
      type: String,
      enum: [
        "booking_initiated",
        "confirmed",
        "voucher_generated",
        "cancelled",
        "completed",
        "failed",
      ],
      default: "booking_initiated",
      index: true,
    },

    /* ================= DOCUMENTS ================= */

    voucherUrl: String,
    invoiceUrl: String,

    /* ================= CANCELLATION ================= */

    cancellationDetails: {
      cancelledAt: Date,
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: String,
      refundAmount: Number,
      cancellationCharges: Number,
      refundStatus: {
        type: String,
        enum: ["pending", "processed", "failed"],
      },
    },
  },
  { timestamps: true },
);

hotelBookingSchema.index({ corporateId: 1, createdAt: -1 });
hotelBookingSchema.index({ checkInDate: 1 });
hotelBookingSchema.index({ status: 1 });

module.exports = mongoose.model("HotelBooking", hotelBookingSchema);
