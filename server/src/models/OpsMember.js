// server/src/models/OpsMember.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const OpsMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: ["Booking Manager", "Support Agent", "Finance OPS"],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: ["Flights", "Hotels", "Both"],
    },
    permissions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
OpsMemberSchema.pre("save", function () {
  if (!this.isModified("password")) return Promise.resolve();

  return bcrypt.genSalt(12)
    .then(salt => bcrypt.hash(this.password, salt))
    .then(hash => {
      this.password = hash;
    });
});

// Method to check password
OpsMemberSchema.methods.comparePassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Index for search
OpsMemberSchema.index({ name: "text", email: "text" });

module.exports = mongoose.model("OpsMember", OpsMemberSchema);
