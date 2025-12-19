// server/src/config/tbo.config.js

module.exports = {
  
  timeout: 30000,

  /* ---------------- COMMON ---------------- */
  common: {
    base: 'https://api.tektravels.com',
    sharedBase: 'https://Sharedapi.tektravels.com',

    airService: '/BookingEngineService_Air/AirService.svc/rest',
    sharedService: '/SharedData.svc/rest'
  },

  /* ---------------- DUMMY (SEARCH ONLY) ---------------- */
  dummy: {
    base: 'https://api.tektravels.com',
    sharedBase: 'https://Sharedapi.tektravels.com',

    endUserIp: process.env.TBO_END_USER_IP,

    credentials: {
      username: process.env.TBO_DUMMY_USERNAME,
      password: process.env.TBO_DUMMY_PASSWORD,
      clientId: process.env.TBO_DUMMY_CLIENT_ID
    },

    endpoints: {
      authenticate: '/SharedData.svc/rest/Authenticate',

      // Air Search
      flightSearch: '/BookingEngineService_Air/AirService.svc/rest/Search'
    }
  },

  /* ---------------- LIVE (FULL FLOW) ---------------- */
  live: {
    base: 'https://api.tektravels.com',
    sharedBase: 'https://Sharedapi.tektravels.com',

    endUserIp: process.env.TBO_END_USER_IP,

    credentials: {
      username: process.env.TBO_LIVE_USERNAME,
      password: process.env.TBO_LIVE_PASSWORD,
      clientId: process.env.TBO_LIVE_CLIENT_ID
    },

    endpoints: {
      authenticate: '/SharedData.svc/rest/Authenticate',

      // Core Flow
      flightSearch: '/BookingEngineService_Air/AirService.svc/rest/Search',
      flightFareQuote: '/BookingEngineService_Air/AirService.svc/rest/FareQuote',
      flightFareRule: '/BookingEngineService_Air/AirService.svc/rest/FareRule',

      // Booking
      flightBook: '/BookingEngineService_Air/AirService.svc/rest/Book',
      flightTicket: '/BookingEngineService_Air/AirService.svc/rest/Ticket',

      // Post Booking
      flightBookingDetails:
        '/BookingEngineService_Air/AirService.svc/rest/GetBookingDetails',
      flightCancel:
        '/BookingEngineService_Air/AirService.svc/rest/Cancel',

      // SSR / Extras (Optional but important)
      flightSSR:
        '/BookingEngineService_Air/AirService.svc/rest/SSR',
      flightSeatMap:
        '/BookingEngineService_Air/AirService.svc/rest/SeatMap',
      flightMeal:
        '/BookingEngineService_Air/AirService.svc/rest/Meal'
    }
  }
};
