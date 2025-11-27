const mongoose = require("mongoose");

const CorporateAdminSchema = new mongoose.Schema(
  {
    corporateName: { type: String, required: true }, // Corporate Name
    domain: { type: String, required: true }, // Email domain (SSO)

    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    mobile: { type: String, required: true },

    password: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: ["CorporateAdmin"],
      default: "CorporateAdmin",
    },

    active: { type: Boolean, default: true },

    // for company settings, onboarding progress
    corporateSettings: {
      classification: {
        type: String,
        enum: ["prepaid", "postpaid"],
        default: "postpaid",
      },
      creditLimit: { type: Number, default: 0 },
      billingCycleDays: { type: Number, default: 30 },
      travelPolicy: {
        allowedCabin: { type: [String], default: ["Economy"] },
        allowAncillaries: { type: Boolean, default: true },
      },
      walletBalance: { type: Number, default: 0 },

      // Required SSO Type
      sso: {
        type: {
          type: String,
          enum: ["google", "microsoft", "zoho", "none"],
          default: "none",
        },
        enabled: { type: Boolean, default: false },
        config: mongoose.Schema.Types.Mixed,
      },

      // KYC Data
      kyc: {
        gstUrl: String,
        panUrl: String,
        verified: { type: Boolean, default: false },
        approvedAt: Date,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },

      // Primary Contact Person
      primaryContact: {
        name: String,
        email: String,
        mobile: String,
      },

      // Secondary Contact
      secondaryContact: {
        name: String,
        email: String,
        mobile: String,
      },

      // Billing Department Details
      billingDepartment: {
        name: String,
        email: String,
        mobile: String,
      },

      // Optional credit notes discussed internally
      creditTermsNotes: String,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "super-admin",
      required: false,
    },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CorporateAdmin", CorporateAdminSchema);
