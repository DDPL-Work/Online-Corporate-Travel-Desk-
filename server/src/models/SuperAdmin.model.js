const mongoose = require("mongoose");

const SuperAdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["super-admin"], default: "super-admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("super-admin", SuperAdminSchema);
