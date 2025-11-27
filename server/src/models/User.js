const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: true
    },

    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String },

    role: {
      type: String,
      enum: [
        "employee",
        "manager",
        "travel-admin",
        "corporate-admin",
        "super-admin"
      ],
      default: "employee"
    },

    department: { type: String, default: "" },

    password: { type: String },

    // SSO Fields (Google, Zoho, Microsoft)
    ssoProvider: { type: String, enum: ["google", "zoho", "microsoft", null], default: null },
    ssoId: { type: String, default: null },

    isActive: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
