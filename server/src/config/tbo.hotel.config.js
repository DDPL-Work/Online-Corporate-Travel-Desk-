//server\src\config\tbo.hotel.config.js
module.exports = {
  timeout: 30000,

  /* ---------------- COMMON ---------------- */
  common: {
    base2: "https://HotelBE.tektravels.com",
    base1: "https://affiliate.tektravels.com",
    // base2: "https://hotelbe.tektravels.com",
    sharedBase: "https://Sharedapi.tektravels.com",
    staticBase: "http://api.tbotechnology.in",
  },

  /* ---------------- DUMMY (SEARCH ONLY / TEST) ---------------- */
  dummy: {
    base: "https://HotelBE.tektravels.com",
    base1: "https://affiliate.tektravels.com",
    base2: "https://hotelbe.tektravels.com",
    sharedBase: "https://Sharedapi.tektravels.com",
    staticBase: "http://api.tbotechnology.in",

    endUserIp: process.env.TBO_END_USER_IP,

    credentials: {
      username: process.env.TBO_DUMMY_USERNAME,
      password: process.env.TBO_DUMMY_PASSWORD,
      clientId: process.env.TBO_DUMMY_CLIENT_ID,
      tboUSerName: process.env.TBO_STATIC_USERNAME,
      tboPassword: process.env.TBO_STATIC_PASSWORD,
    },

    tokens: {
      tokenId: process.env.TBO_DUMMY_TOKEN_ID,
      agencyId: process.env.TBO_DUMMY_TOKEN_AGENCY_ID,
      memberId: process.env.TBO_DUMMY_TOKEN_MEMBER_ID,
    },

    endpoints: {
      /* Authentication */
      authenticate: "/SharedData.svc/rest/Authenticate",
      getAgencyBalance: "/SharedData.svc/rest/GetAgencyBalance",

      /* Hotel Static Data */
      countryList: "/TBOHolidays_HotelAPI/CountryList",
      cityLIst: "/TBOHolidays_HotelAPI/CityList",
      tboHotelCodeList: "/TBOHolidays_HotelAPI/TBOHotelCodeList",
      hotelCodeList: "/TBOHolidays_HotelAPI/hotelcodelist",
      hotelDetails: "/HotelAPI/Hoteldetails",

      /* Hotel Search */
      hotelSearch: "/HotelAPI/Search",

      /* Booking Flow */
      hotelPreBook: "/HotelAPI/PreBook",
      hotelBook: "/hotelservice.svc/rest/book",
      generateVoucher: "/hotelservice.svc/rest/GenerateVoucher",

      /* Post Booking */
      getBookingDetails: "/hotelservice.svc/rest/Getbookingdetail",
      getChangeRequestStatus:
        "/hotelservice.svc/rest/GetChangeRequestStatus",
      sendChangeRequest: "/hotelservice.svc/rest/SendChangeRequest",
    },
  },

  /* ---------------- LIVE (FULL FLOW) ---------------- */
  live: {
    // base: "https://HotelBE.tektravels.com",
    base1: "https://affiliate.travelboutiqueonline.com/HotelAPI",
    base2: "https://hotelbooking.travelboutiqueonline.com/HotelAPI_V10/HotelService.svc/rest",
    sharedBase: "https://api.travelboutiqueonline.com/SharedAPI",
    staticBase: "http://affiliate.travelboutiqueonline.com/TBOHolidays_HotelAPI",

    endUserIp: process.env.TBO_END_USER_IP,

    credentials: {
      username: process.env.TBO_PROD_USERNAME,
      password: process.env.TBO_PROD_PASSWORD,
      clientId: process.env.TBO_PROD_CLIENT_ID,
      tboUSerName: process.env.TBO_PROD_USERNAME,
      tboPassword: process.env.TBO_PROD_PASSWORD,
    },

    tokens: {
      tokenId: process.env.TBO_LIVE_TOKEN_ID,
      agencyId: process.env.TBO_LIVE_TOKEN_AGENCY_ID,
      memberId: process.env.TBO_LIVE_TOKEN_MEMBER_ID,
    },

    endpoints: {
      /* Authentication */
      authenticate: "/SharedData.svc/rest/Authenticate",
      getAgencyBalance: "/SharedData.svc/rest/GetAgencyBalance",

      /* Hotel Static Data */
      countryList: "/CountryList",
      cityLIst: "/CityList",
      tboHotelCodeList: "/TBOHotelCodeList",
      hotelDetails: "/Hoteldetails",
      hotelCodeList: "/hotelcodelist",

      /* Hotel Search */
      hotelSearch: "/Search",
      hotelPreBook: "/PreBook",

      /* Booking Flow */
      hotelBook: "/book",
      generateVoucher: "/GenerateVoucher",

      /* Post Booking */
      getBookingDetails: "/Getbookingdetail",
      getChangeRequestStatus:
        "/GetChangeRequestStatus",
      sendChangeRequest: "/SendChangeRequest",
    },
  },
};
