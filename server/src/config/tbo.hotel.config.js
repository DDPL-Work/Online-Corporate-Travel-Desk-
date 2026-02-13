module.exports = {
  timeout: 500000,

  /* ---------------- COMMON ---------------- */
  common: {
    base: "https://HotelBE.tektravels.com",
    sharedBase: "https://Sharedapi.tektravels.com",

    hotelService: "/hotelservice.svc/rest",
    internalHotelService: "/internalhotelservice.svc/rest",
    sharedService: "/SharedData.svc/rest",
  },

  /* ---------------- DUMMY (SEARCH ONLY / TEST) ---------------- */
  dummy: {
    base: "https://HotelBE.tektravels.com",
    sharedBase: "https://Sharedapi.tektravels.com",

    endUserIp: process.env.TBO_END_USER_IP,

    credentials: {
      username: process.env.TBO_DUMMY_USERNAME,
      password: process.env.TBO_DUMMY_PASSWORD,
      clientId: process.env.TBO_DUMMY_CLIENT_ID,
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

      /* Hotel Search */
      hotelSearch: "/hotelservice.svc/rest/Gethotelresult",
      hotelInfo: "/hotelservice.svc/rest/GetHotelInfo",
      hotelRoom: "/hotelservice.svc/rest/GetHotelRoom",

      /* Booking Flow */
      blockRoom: "/hotelservice.svc/rest/blockRoom",
      hotelBook: "/hotelservice.svc/rest/book",
      generateVoucher: "/hotelservice.svc/rest/GenerateVoucher",

      /* Post Booking */
      getBookingDetails: "/internalhotelservice.svc/rest/GetBookingDetail",
      getChangeRequestStatus:
        "/internalhotelservice.svc/rest/GetChangeRequestStatus",
      sendChangeRequest: "/internalhotelservice.svc/rest/SendChangeRequest",
    },
  },

  /* ---------------- LIVE (FULL FLOW) ---------------- */
  live: {
    base: "https://HotelBE.tektravels.com",
    sharedBase: "https://Sharedapi.tektravels.com",

    endUserIp: process.env.TBO_END_USER_IP,

    credentials: {
      username: process.env.TBO_LIVE_USERNAME,
      password: process.env.TBO_LIVE_PASSWORD,
      clientId: process.env.TBO_LIVE_CLIENT_ID,
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

      /* Hotel Search */
      hotelSearch: "/hotelservice.svc/rest/Gethotelresult",
      hotelInfo: "/hotelservice.svc/rest/GetHotelInfo",
      hotelRoom: "/hotelservice.svc/rest/GetHotelRoom",

      /* Booking Flow */
      blockRoom: "/hotelservice.svc/rest/blockRoom",
      hotelBook: "/hotelservice.svc/rest/book",
      generateVoucher: "/hotelservice.svc/rest/GenerateVoucher",

      /* Post Booking */
      getBookingDetails: "/internalhotelservice.svc/rest/GetBookingDetail",
      getChangeRequestStatus:
        "/internalhotelservice.svc/rest/GetChangeRequestStatus",
      sendChangeRequest: "/internalhotelservice.svc/rest/SendChangeRequest",
    },
  },
};
