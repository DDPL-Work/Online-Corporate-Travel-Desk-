const mongoose = require("mongoose");

const markupAuditSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true
    },
    corporateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corporate",
      required: false,
      index: true
    },
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CorporateMarkup",
      required: false,
      index: true
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "ACTIVATE", "DEACTIVATE"],
      required: true,
      index: true
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const MarkupAudit = mongoose.models.MarkupAudit || mongoose.model("MarkupAudit", markupAuditSchema);

module.exports = MarkupAudit;
