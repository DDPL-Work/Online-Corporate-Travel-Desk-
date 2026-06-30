const mongoose = require("mongoose");

const TBOHotelSchema = new mongoose.Schema(
  {
    hotelCode: {
      type: String,
      required: true,
      index: true,
    },
    hotelName: {
      type: String,
      index: true,
    },
    hotelAddress: {
      type: String,
    },
    starRating: {
      type: String,
    },
    cityCode: {
      type: String,
      required: true,
      index: true,
    },
    cityName: {
      type: String,
    },
    countryCode: {
      type: String,
      index: true,
    },
    thumbnail: {
      type: String,
    },
    location: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Unique index for the hotel in a specific city
TBOHotelSchema.index({ hotelCode: 1, cityCode: 1 }, { unique: true });

module.exports = mongoose.model("TBOHotel", TBOHotelSchema);
