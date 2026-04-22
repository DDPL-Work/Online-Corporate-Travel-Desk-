// server/src/models/SuperAdmin.model.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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

// Hash password before saving
SuperAdminSchema.pre("save", function () {
  if (!this.isModified("password")) return Promise.resolve();

  return bcrypt.genSalt(12)
    .then(salt => bcrypt.hash(this.password, salt))
    .then(hash => {
      this.password = hash;
    });
});

// Compare password method
SuperAdminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

SuperAdminSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("SuperAdmin", SuperAdminSchema);
