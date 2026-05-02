//hotelBookingRequest.model.js

const mongoose = require("mongoose");

const hotelBookingRequestSchema = new mongoose.Schema(
  {
    /* ================= CORE ================= */

    bookingReference: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      unique: true,
      index: true,
    },

    bookingType: {
      type: String,
      enum: ["flight", "hotel"],
      required: true,
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

    /* ================= APPROVAL ================= */

    requestStatus: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected", "expired"],
      default: "draft",
      index: true,
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,

    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: Date,

    approverComments: String,

    purposeOfTravel: {
      type: String,
      required: true,
    },

    /* ================= PROJECT & APPROVER ================= */

    projectName: String,
    projectId: String,
    projectClient: String,

    approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approverEmail: String,
    approverName: String,
    approverRole: String,

    /* ================= GST DETAILS ================= */

    gstDetails: {
      gstin: String,
      legalName: String,
      address: String,
      gstEmail: String,
    },

    travellers: [
      {
        title: String,
        firstName: String,
        lastName: String,

        gender: String,
        dob: Date,
        age: Number,

        email: String,
        phoneWithCode: String,

        nationality: String,
        countryCode: String,

        panCard: String,
        PassportNo: String,
        PassportIssueDate: Date,
        PassportExpDate: Date,

        isLeadPassenger: Boolean,
        paxType: String, // lead | adult | child

        // 🔥 backup (important)
        raw: mongoose.Schema.Types.Mixed,
      },
    ],

    /* ================= HOTEL REQUEST ================= */

    hotelRequest: {
      cityId: String,
      cityName: String,
      countryCode: String,

      checkInDate: Date,
      checkOutDate: Date,
      noOfNights: Number,
      noOfRooms: Number,

      roomGuests: [
        {
          noOfAdults: Number,
          noOfChild: Number,
          childAge: [Number],
        },
      ],

      preferredCurrency: {
        type: String,
        default: "INR",
      },

      guestNationality: {
        type: String,
        default: "IN",
      },

      selectedHotel: {
        hotelCode: String,
        hotelName: String,
        starRating: Number,
        address: String,
        city: String,
        country: String,
        images: [String],
      },

      rawHotelData: mongoose.Schema.Types.Mixed,
      allRooms: mongoose.Schema.Types.Mixed,

      selectedRoom: {
        roomIndex: String,

        roomTypeName: String,
        ratePlanName: String,

        // 🔥 pricing
        totalFare: Number,
        totalTax: Number,
        currency: String,

        // 🔥 details
        inclusion: String,
        mealType: String,
        isRefundable: Boolean,
        withTransfers: Boolean,

        // 🔥 policies
        cancelPolicies: mongoose.Schema.Types.Mixed,

        // 🔥 IMPORTANT
        bookingCode: String,

        // 🔥 FULL RAW ROOM
        rawRoomData: mongoose.Schema.Types.Mixed,
      },

      providerBookingId: String,

      providerTraceId: String,
      providerSearchResponse: mongoose.Schema.Types.Mixed,
      providerRoomInfoResponse: mongoose.Schema.Types.Mixed,
    },

    /* ================= PRICING ================= */

    pricingSnapshot: {
      totalAmount: Number,
      currency: { type: String, default: "INR" },
      capturedAt: Date,
    },

    /* ================= EXECUTION ================= */

    executionStatus: {
      type: String,
      enum: [
        "not_started",
        "booking_initiated",
        "booked",
        "voucher_generated",
        "failed",
      ],
      default: "not_started",
      index: true,
    },

    bookingResult: {
      hotelBookingId: String,
      confirmationNumber: String,
      providerBookingId: String,
      providerResponse: mongoose.Schema.Types.Mixed,
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
        enum: ["pending", "completed", "failed"],
      },
    },

    /* ================= SNAPSHOT ================= */

    bookingSnapshot: {
      hotelName: String,
      hotelImage: String,
      city: String,
      checkInDate: Date,
      checkOutDate: Date,
      roomCount: Number,
      nights: Number,
      amount: Number,
      currency: { type: String, default: "INR" },
    },

    /* ================= DOCUMENTS ================= */

    documents: {
      voucherUrl: String,
      invoiceUrl: String,
    },

    /* ================= CANCELLATION ================= */

    cancellation: {
      cancelledAt: Date,
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: String,
      refundAmount: Number,
      refundStatus: String,
    },

    /* ================= AMENDMENT ================= */

    amendment: {
      changeRequestId: String, // from TBO
      amendmentType: {
        type: String,
        enum: ["amendment", "cancellation"],
        default: "amendment",
      },

      status: {
        type: String,
        enum: [
          "not_requested",
          "requested",
          "in_progress",
          "approved",
          "rejected",
          "failed",
        ],
        default: "not_requested",
      },

      remarks: String,

      requestedAt: Date,
      lastCheckedAt: Date,

      providerResponse: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

/* ================= INDEXES ================= */

hotelBookingRequestSchema.index({ corporateId: 1, requestStatus: 1 });
hotelBookingRequestSchema.index({ corporateId: 1, createdAt: -1 });
hotelBookingRequestSchema.index({ executionStatus: 1 });

module.exports = mongoose.model(
  "HotelBookingRequest",
  hotelBookingRequestSchema,
);
