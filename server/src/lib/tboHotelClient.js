const axios = require("axios");
const hotelConfig = require("../config/tbo.hotel.config");

const env = "live"; // or from process.env

const tboHotelClient = axios.create({
  baseURL: hotelConfig.common.base,
  timeout: hotelConfig.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

module.exports = {
  client: tboHotelClient,
  config: hotelConfig[env],
  common: hotelConfig.common,
};
