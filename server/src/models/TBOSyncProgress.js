const mongoose = require("mongoose");

const TBOSyncProgressSchema = new mongoose.Schema(
  {
    syncType: { type: String, required: true, unique: true }, // "hotels" or "hotelDetails"
    lastProcessedId: { type: String }, // cityCode or hotelCode
    processedCount: { type: Number, default: 0 },
    totalToProcess: { type: Number, default: 0 },
    status: { type: String, enum: ["running", "completed", "failed"], default: "running" },
    lastUpdateTime: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TBOSyncProgress", TBOSyncProgressSchema);
