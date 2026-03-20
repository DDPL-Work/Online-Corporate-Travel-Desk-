// server/src/models/Corporate.js
const mongoose = require("mongoose");

const corporateSchema = new mongoose.Schema(
  {
    // ───── BASIC INFO ─────
    corporateName: {
      type: String,
      required: true,
      trim: true,
    },

    // email: {
    //   type: String,
    //   required: true,
    //   lowercase: true,
    //   trim: true,
    // },

    defaultApprover: {
      type: String,
      enum: ["travel-admin", "manager"],
      default: "travel-admin",
    },

    // ───── REGISTERED ADDRESS ─────
    registeredAddress: {
      street: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: "India" },
    },

    // ───── CONTACTS ─────
    primaryContact: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      mobile: { type: String, required: true },
      role: {
        type: String,
        enum: ["corporate-super-admin"],
        default: "corporate-super-admin",
      },
    },

    secondaryContact: {
      name: String,
      email: { type: String, lowercase: true },
      mobile: String,
      role: {
        type: String,
        enum: ["travel-admin"],
        default: "travel-admin",
      },
    },

    billingDepartment: {
      name: String,
      email: { type: String, lowercase: true },
      mobile: String,
    },

    // ───── SSO CONFIG ─────
    ssoConfig: {
      type: {
        type: String,
        enum: ["google", "microsoft", "zoho", "saml"],
        required: true,
      },
      domain: { type: String, required: true, lowercase: true },
      samlMetadata: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
    },

    // ───── GST DETAILS ─────
    gstDetails: {
      gstin: {
        type: String,
        uppercase: true,
        trim: true,
        index: true,
      },
      legalName: String,
      address: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
    },

    // ───── DOCUMENT STORAGE (Cloudinary) ─────
    gstCertificate: {
      publicId: String,
      url: String,
      uploadedAt: Date,
      verified: { type: Boolean, default: false },
    },

    panCard: {
      number: String,
      publicId: String,
      url: String,
      uploadedAt: Date,
      verified: { type: Boolean, default: false },
    },

    // ───── BILLING & ACCOUNT TYPE (KEPT AS REQUESTED) ─────
    classification: {
      type: String,
      enum: ["prepaid", "postpaid"],
      required: true,
      default: "prepaid",
    },

    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentCredit: {
      type: Number,
      default: 0,
      min: 0,
    },

    billingCycle: {
      type: String,
      enum: ["15days", "30days", "custom"],
      default: "30days",
    },

    customBillingDays: {
      type: Number,
      min: 1,
      max: 365,
    },

    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ───── TRAVEL POLICY ─────
    travelPolicy: {
      allowedCabinClass: {
        type: [String],
        enum: ["Economy", "Premium Economy", "Business", "First"],
        default: ["Economy"],
      },
      allowAncillaryServices: { type: Boolean, default: true },
      advanceBookingDays: { type: Number, default: 0 },
      maxBookingAmount: { type: Number, default: 0 },
    },

    // ───── SYSTEM FIELDS ─────
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "disabled"],
      default: "pending",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    onboardedAt: Date,
    onboardedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
corporateSchema.index({ corporateName: 1 });
corporateSchema.index({ "primaryContact.email": 1 }, { unique: true });
corporateSchema.index({ "ssoConfig.domain": 1, "ssoConfig.verified": 1 });
corporateSchema.index({ status: 1, isActive: 1 });
corporateSchema.index({ classification: 1, status: 1 });

// Virtual for credit utilization
corporateSchema.virtual("creditUtilization").get(function () {
  if (this.classification === "prepaid" || !this.creditLimit) return 0;
  return ((this.currentCredit / this.creditLimit) * 100).toFixed(2);
});

// Method to check if credit limit exceeded
corporateSchema.methods.canBook = function (amount) {
  if (this.classification === "prepaid") return this.walletBalance >= amount;
  return this.currentCredit + amount <= this.creditLimit;
};

// Pre-save middleware
corporateSchema.pre("save", async function () {
  if (this.isNew && this.status === "active" && !this.onboardedAt) {
    this.onboardedAt = new Date();
  }
});

module.exports = mongoose.model("Corporate", corporateSchema);
