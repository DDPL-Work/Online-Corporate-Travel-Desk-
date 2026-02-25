// TBO Hotel Service Configuration
module.exports = {
  timeout: 500000,

  /* -------------------------------------------------------------------------- */
  /*                                  COMMON                                    */
  /* -------------------------------------------------------------------------- */
  common: {
    // Core API (HotelInfo, Block, Book)
    base: "https://api.tektravels.com",

    // Hotel Search / Voucher / Internal
    hotelBase: "https://HotelBE.tektravels.com",

    // Shared static data
    sharedBase: "https://api.tektravels.com",
  },

  /* -------------------------------------------------------------------------- */
  /*                                   LIVE                                     */
  /* -------------------------------------------------------------------------- */
  live: {
    endUserIp: process.env.TBO_END_USER_IP,

    credentials: {
      // ⚠️ Only ClientId is needed here (username/password live in tbo.config.js)
      clientId: process.env.TBO_LIVE_CLIENT_ID,
    },

    // ❌ NO TOKENS HERE
    // Tokens are generated dynamically via Authenticate API (tboAuth)

    endpoints: {
      /* -------------------------- STATIC / SHARED -------------------------- */
      countryList:
        "/SharedServices/SharedData.svc/rest/CountryList",

      topDestinations:
        "/SharedServices/SharedData.svc/rest/TopDestinationList",

      destinationSearch:
        "/SharedServices/StaticData.svc/rest/GetDestinationSearchStaticData",

      /* ----------------------------- SEARCH -------------------------------- */
      hotelSearch:
        "/hotelservice.svc/rest/Gethotelresult",

      /* ----------------------------- INFO ---------------------------------- */
      hotelInfo:
        "/BookingEngineService_Hotel/hotelservice.svc/rest/GetHotelInfo",

      /* --------------------------- BLOCK / BOOK ----------------------------- */
      blockRoom:
        "/BookingEngineService_Hotel/hotelservice.svc/rest/BlockRoom",

      bookHotel:
        "/BookingEngineService_Hotel/hotelservice.svc/rest/Book",

      /* -------------------------- POST BOOKING ------------------------------ */
      generateVoucher:
        "/hotelservice.svc/rest/GenerateVoucher",

      getBookingDetails:
        "/internalhotelservice.svc/rest/GetBookingDetail",
    },
  },
};
