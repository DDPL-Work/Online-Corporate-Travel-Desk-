const mongoose = require("mongoose");

const tboSyncLogSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ["START", "COMPLETE", "ERROR", "PAUSE", "RESUME", "CANCEL"],
        },
        message: {
            type: String,
            required: true,
        },
        affectedSyncs: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true, // This will automatically add createdAt and updatedAt
    }
);

// Index for efficient querying of recent logs
tboSyncLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("TBOSyncLog", tboSyncLogSchema);
