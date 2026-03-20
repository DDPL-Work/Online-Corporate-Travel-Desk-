//TravelDocument.js
const { default: mongoose } = require("mongoose");

const travelDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["passport", "visa", "pan", "other"],
      required: true,
    },

    name: String, // optional label (e.g. "US Visa", "UK Visa")

    number: String,

    expiry: Date,

    issueDate: String,
    rawText: String,

    fileUrl: String,
    fileName: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("TravelDocument", travelDocumentSchema);
