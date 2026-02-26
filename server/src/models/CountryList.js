// server/src/models/CountryList.js
const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema(
  {
    Code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    Name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

countrySchema.index({ Code: 1 }, { unique: true });
countrySchema.index({ Name: 1 });

module.exports = mongoose.model("Country", countrySchema);
