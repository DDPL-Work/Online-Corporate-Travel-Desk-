const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientType",
      index: true,
    },
    recipientType: {
      type: String,
      enum: ["User", "OpsMember", "SuperAdmin"],
      default: "User",
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ["travel-admin", "manager", "employee", "super-admin", "ops-member"],
      index: true,
    },
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "other",
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for efficient fetching
notificationSchema.index({ corporateId: 1, recipient: 1 });
notificationSchema.index({ corporateId: 1, recipientRole: 1 });


module.exports = mongoose.model("Notification", notificationSchema);
