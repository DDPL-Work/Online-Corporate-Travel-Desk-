const mongoose = require("mongoose");

const airportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    iata_code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Airport", airportSchema);
