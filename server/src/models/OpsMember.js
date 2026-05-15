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
      enum: ["Booking Manager", "Support Agent", "Finance OPS", "ops-member"],
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
    currentActiveAssignments: {
      type: Number,
      default: 0,
    },
    currentWorkload: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAssignedAt: {
      type: Date,
      default: null,
    },
    lastAssignmentType: {
      type: String,
      enum: ["REISSUE", "CANCELLATION", "REFUND", "BOOKING"],
      default: null,
    },
    availabilityStatus: {
      type: String,
      enum: ["AVAILABLE", "BUSY", "BREAK", "OFFLINE"],
      default: "AVAILABLE",
    },
    maxConcurrentAssignments: {
      type: Number,
      default: 10,
    },
    autoAssignmentEnabled: {
      type: Boolean,
      default: true,
    },
    isAvailableForReissues: {
      type: Boolean,
      default: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    assignmentStats: {
      totalAssigned: {
        type: Number,
        default: 0,
      },
      totalCompleted: {
        type: Number,
        default: 0,
      },
      avgResolutionMinutes: {
        type: Number,
        default: 0,
      },
      slaBreaches: {
        type: Number,
        default: 0,
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: true,
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
OpsMemberSchema.index({ status: 1, availabilityStatus: 1, department: 1 });
OpsMemberSchema.index({ currentActiveAssignments: 1 });
OpsMemberSchema.index({ currentWorkload: 1, lastAssignedAt: 1 });
OpsMemberSchema.index({ autoAssignmentEnabled: 1 });
OpsMemberSchema.index({ isAvailableForReissues: 1 });
OpsMemberSchema.index({ isOnline: 1, lastSeenAt: 1 });

module.exports = mongoose.model("OpsMember", OpsMemberSchema);
