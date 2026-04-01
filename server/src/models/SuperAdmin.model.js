// server/src/models/SuperAdmin.model.js

const mongoose = require("mongoose");

const SuperAdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["super-admin"], default: "super-admin" },
  },
  { timestamps: true }
);

SuperAdminSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("SuperAdmin", SuperAdminSchema);
