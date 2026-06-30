const mongoose = require("mongoose");

const TBOCitySchema = new mongoose.Schema(
  {
    cityCode: {
      type: String,
      required: true,
    },
    cityName: {
      type: String,
      required: true,
      index: true,
    },
    countryCode: {
      type: String,
      required: true,
      index: true,
    },
    countryName: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to prevent duplicate cities within the same country
TBOCitySchema.index({ cityCode: 1, countryCode: 1 }, { unique: true });

module.exports = mongoose.model("TBOCity", TBOCitySchema);
