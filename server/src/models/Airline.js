const mongoose = require("mongoose");

const AirlineSchema = new mongoose.Schema(
  {
    sourceId: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    alias: {
      type: String,
      default: null,
      trim: true,
    },
    iata: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    icao: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    callsign: {
      type: String,
      default: null,
      trim: true,
    },
    country: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: iata + icao prevents duplicates for same carrier
AirlineSchema.index({ iata: 1, icao: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Airline", AirlineSchema);
