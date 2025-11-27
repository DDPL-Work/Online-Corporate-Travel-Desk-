const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema(
  {
    corporateAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CorporateAdmin",
      required: true,
    },

    name: { type: String, required: true },

    email: { type: String, required: true, unique: true, lowercase: true },

    password: { type: String, required: true, select: false },

    mobile: { type: String, required: true },

    department: { type: String },
    designation: { type: String },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", EmployeeSchema);
