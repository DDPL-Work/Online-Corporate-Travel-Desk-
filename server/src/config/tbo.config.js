module.exports = {
  baseUrl: process.env.TBO_API_URL || 'https://api.tektravels.com',
  credentials: {
    username: process.env.TBO_USERNAME,
    password: process.env.TBO_PASSWORD,
    apiKey: process.env.TBO_API_KEY
  },
  endUserIp: process.env.TBO_END_USER_IP || '103.25.198.106',
  endpoints: {
    // Authentication
    authenticate: '/SharedServices/SharedData.svc/rest/Authenticate',
    
    // Flight APIs
    flightSearch: '/FlightAPI_V1/Search',
    flightFareRule: '/FlightAPI_V1/FareRule',
    flightFareQuote: '/FlightAPI_V1/FareQuote',
    flightBook: '/FlightAPI_V1/Book',
    flightTicket: '/FlightAPI_V1/Ticket',
    flightBookingDetails: '/FlightAPI_V1/GetBookingDetails',
    flightCancel: '/FlightAPI_V1/Cancel',
    
    // Hotel APIs
    hotelSearch: '/HotelAPI_V1/Search',
    hotelInfo: '/HotelAPI_V1/HotelDetails',
    hotelRoom: '/HotelAPI_V1/GetHotelRoom',
    hotelBlock: '/HotelAPI_V1/BlockRoom',
    hotelBook: '/HotelAPI_V1/Book',
    hotelBookingDetails: '/HotelAPI_V1/GetBookingDetail',
    hotelCancel: '/HotelAPI_V1/ChangeRequest'
  },
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000 // 1 second
};
