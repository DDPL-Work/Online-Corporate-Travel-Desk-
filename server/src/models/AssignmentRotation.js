const mongoose = require("mongoose");

const assignmentRotationSchema = new mongoose.Schema(
  {
    queueType: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    currentIndex: {
      type: Number,
      default: 0,
    },
    lastAssignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OpsMember",
    },
    lastAssignedAt: Date,
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.AssignmentRotation ||
  mongoose.model("AssignmentRotation", assignmentRotationSchema);
