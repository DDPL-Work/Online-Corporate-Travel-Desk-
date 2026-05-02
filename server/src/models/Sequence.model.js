const mongoose = require("mongoose");

const sequenceSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    sequence_value: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sequence", sequenceSchema);
