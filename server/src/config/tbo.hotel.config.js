module.exports = {
  timeout: 500000,

  /* ---------------- COMMON ---------------- */
  common: {
    base: "https://HotelBE.tektravels.com",
    base1: "https://affiliate.tektravels.com",
    base2: "https://hotelbe.tektravels.com",
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
      hotelCodeList: "/TBOHolidays_HotelAPI/TBOHotelCodeList",
      hotelDetails: "/TBOHolidays_HotelAPI/Hoteldetails",

      /* Hotel Search */
      hotelSearch: "/HotelAPI/Search",

      /* Booking Flow */
      hotelPreBook: "/HotelAPI/PreBook",
      hotelBook: "/hotelservice.svc/rest/book",
      generateVoucher: "/hotelservice.svc/rest/GenerateVoucher",

      /* Post Booking */
      getBookingDetails: "/hotelservice.svc/rest/Getbookingdetail",
      getChangeRequestStatus:
        "/internalhotelservice.svc/rest/GetChangeRequestStatus",
      sendChangeRequest: "/internalhotelservice.svc/rest/SendChangeRequest",
    },
  },

  /* ---------------- LIVE (FULL FLOW) ---------------- */
  live: {
    base: "https://HotelBE.tektravels.com",
    base1: "https://affiliate.tektravels.com",
    base2: "https://hotelbe.tektravels.com",
    sharedBase: "https://Sharedapi.tektravels.com",
    staticBase: "http://api.tbotechnology.in",

    endUserIp: process.env.TBO_END_USER_IP,

    credentials: {
      username: process.env.TBO_LIVE_USERNAME,
      password: process.env.TBO_LIVE_PASSWORD,
      clientId: process.env.TBO_LIVE_CLIENT_ID,
      tboUSerName: process.env.TBO_STATIC_USERNAME,
      tboPassword: process.env.TBO_STATIC_PASSWORD,
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
      countryList: "/TBOHolidays_HotelAPI/CountryList",
      cityLIst: "/TBOHolidays_HotelAPI/CityList",
      hotelCodeList: "/TBOHolidays_HotelAPI/TBOHotelCodeList",
      hotelDetails: "/TBOHolidays_HotelAPI/Hoteldetails",

      /* Hotel Search */
      hotelSearch: "/HotelAPI/Search",

      /* Booking Flow */
      hotelPreBook: "/HotelAPI/PreBook",
      hotelBook: "/hotelservice.svc/rest/book",
      generateVoucher: "/hotelservice.svc/rest/GenerateVoucher",

      /* Post Booking */
      getBookingDetails: "/hotelservice.svc/rest/Getbookingdetail",
      getChangeRequestStatus:
        "/internalhotelservice.svc/rest/GetChangeRequestStatus",
      sendChangeRequest: "/internalhotelservice.svc/rest/SendChangeRequest",
    },
  },
};