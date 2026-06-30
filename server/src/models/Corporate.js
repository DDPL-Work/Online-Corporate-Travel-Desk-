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
    corporateType: {
      type: String,
      default: "pvt-ltd",
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
      gstEmail: String,
      contactNumber: String,
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

    corporatePanCard: {
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

    dueDays: {
      type: Number,
      min: 0,
      max: 365,
    },

    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    cycleReceipts: [{
      cycleIndex: { type: Number, required: true },
      receivedAmount: { type: Number, default: 0 },
      receivedAt: Date,
      updatedAt: { type: Date, default: Date.now }
    }],

    // ───── SERVICE FEE RULES ─────
    serviceFeeRules: [
      {
        productType: { type: String, enum: ["Flight", "Hotel"], required: true },
        operation: { type: String, enum: ["Book", "Cancel", "Re-Issue"], required: true },
        tripType: { type: String, enum: ["Domestic", "International"], required: true },
        cabinClass: { type: Number, enum: [2, 3, 4, 5, 6] },
        starRating: { type: Number, enum: [1, 2, 3, 4, 5] },
        roomCount: { type: Number },
        feeType: { type: String, enum: ["Fixed", "Percentage"], required: true },
        feeValue: { type: Number, required: true },
        status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
      }
    ],

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

    // ───── BRANDING & LANDING PAGE ─────
    branding: {
      logo: {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" },
      },
      primaryColor: { type: String, default: "#003580" },
      secondaryColor: { type: String, default: "#0057b8" },
      welcomeMessage: { type: String, default: "Welcome to our Travel Portal" },
      landingPageTitle: { type: String, default: "Corporate Travel Desk" },
      companyType: { type: String, default: "Private Limited" },
      supportEmail: { type: String, default: "support@traveldesk.com" },
      supportPhone: { type: String, default: "+1 800 123 4567" },
    },

    corporateSlug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    corporateUrl: {
      type: String,
      trim: true,
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
