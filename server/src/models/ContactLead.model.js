// server/src/models/ContactLead.model.js
const mongoose = require("mongoose");

const contactLeadSchema = new mongoose.Schema(
  {
    // ───── FORM FIELDS ─────
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },

    workEmail: {
      type: String,
      required: [true, "Work email is required"],
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },

    message: {
      type: String,
      required: [true, "Message / Requirement is required"],
      trim: true,
    },

    // ───── META ─────
    source: {
      type: String,
      default: "traveamer-landing",
    },

    status: {
      type: String,
      enum: ["new", "contacted", "converted", "closed"],
      default: "new",
    },

    notes: {
      type: String, // internal ops notes
      default: "",
    },

    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for quick lookup
contactLeadSchema.index({ workEmail: 1 });
contactLeadSchema.index({ status: 1, createdAt: -1 });
contactLeadSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ContactLead", contactLeadSchema);
