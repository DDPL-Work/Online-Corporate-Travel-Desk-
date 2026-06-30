const mongoose = require("mongoose");

const RoomDetailSchema = new mongoose.Schema({
  roomId:          { type: Number },
  roomName:        { type: String },
  roomSize:        { type: String },
  roomDescription: { type: String },
  imageURL:        [{ type: String }],
}, { _id: false });

const TBOHotelDetailsSchema = new mongoose.Schema(
  {
    hotelCode:       { type: String, required: true, unique: true, index: true },
    hotelName:       { type: String, index: true },
    description:     { type: String },
    address:         { type: String },
    pinCode:         { type: String },
    cityId:          { type: String },
    cityName:        { type: String, index: true },
    countryName:     { type: String },
    countryCode:     { type: String, index: true },
    phoneNumber:     { type: String },
    email:           { type: String },
    faxNumber:       { type: String },
    hotelWebsiteUrl: { type: String },
    map:             { type: String },        // "lat|lng"
    hotelRating:     { type: Number },
    checkInTime:     { type: String },
    checkOutTime:    { type: String },
    image:           { type: String },        // single thumbnail
    images:          [{ type: String }],      // gallery
    hotelFacilities: [{ type: String }],
    attractions:     { type: String },        // JSON stringified object
    hotelFees: {
      optional:  { type: mongoose.Schema.Types.Mixed, default: [] },
      mandatory: { type: mongoose.Schema.Types.Mixed, default: [] },
    },
    roomDetails: [RoomDetailSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("TBOHotelDetails", TBOHotelDetailsSchema);
