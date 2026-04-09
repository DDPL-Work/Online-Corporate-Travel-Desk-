// server/src/config/tbo.config.js

const tboMode = (process.env.TBO_ENV || process.env.NODE_ENV || "development").toLowerCase();
const isProdTbo = ["production", "prod"].includes(tboMode);

const sandboxEndpoints = {
  authenticate: "/SharedData.svc/rest/Authenticate",
  getAgencyBalance: "/SharedData.svc/rest/GetAgencyBalance",

  // Search / pricing
  flightSearch: "/BookingEngineService_Air/AirService.svc/rest/Search",
  flightFareQuote: "/BookingEngineService_Air/AirService.svc/rest/FareQuote",
  flightFareRule: "/BookingEngineService_Air/AirService.svc/rest/FareRule",
  flightFareUpsell: "/BookingEngineService_Air/AirService.svc/rest/FareUpsell",
  flightSSR: "/BookingEngineService_Air/AirService.svc/rest/SSR",
  flightSeatMap: "/BookingEngineService_Air/AirService.svc/rest/SeatMap",
  flightMeal: "/BookingEngineService_Air/AirService.svc/rest/Meal",

  // Booking / post-booking
  flightBook: "/BookingEngineService_Air/AirService.svc/rest/Book",
  flightTicket: "/BookingEngineService_Air/AirService.svc/rest/Ticket",
  flightBookingDetails:
    "/BookingEngineService_Air/AirService.svc/rest/GetBookingDetails",
  flightCancel: "/BookingEngineService_Air/AirService.svc/rest/Cancel",
  flightCancellationCharges:
    "/BookingEngineService_Air/AirService.svc/rest/GetCancellationCharges",
  flightSendChangeRequest:
    "/BookingEngineService_Air/AirService.svc/rest/SendChangeRequest",
  flightGetChangeRequestStatus:
    "/BookingEngineService_Air/AirService.svc/rest/GetChangeRequestStatus",
  flightReleasePNR:
    "/BookingEngineService_Air/AirService.svc/rest/ReleasePNRRequest",
};

const productionEndpoints = {
  authenticate: "/SharedData.svc/rest/Authenticate",
  getAgencyBalance: "/SharedData.svc/rest/GetAgencyBalance",

  // Search / pricing
  flightSearch: "/AirAPI_V10/AirService.svc/rest/Search",
  flightFareQuote: "/AirAPI_V10/AirService.svc/rest/FareQuote",
  flightFareRule: "/AirAPI_V10/AirService.svc/rest/FareRule",
  flightFareUpsell: "/AirAPI_V10/AirService.svc/rest/FareUpsell",
  flightSSR: "/AirAPI_V10/AirService.svc/rest/SSR",
  flightSeatMap: "/AirAPI_V10/AirService.svc/rest/SeatMap",
  flightMeal: "/AirAPI_V10/AirService.svc/rest/Meal",

  // Booking / post-booking
  flightBook: "/AirAPI_V10/AirService.svc/rest/Book",
  flightTicket: "/AirAPI_V10/AirService.svc/rest/Ticket",
  flightBookingDetails:
    "/AirAPI_V10/AirService.svc/rest/GetBookingDetails",
  flightCancel: "/AirAPI_V10/AirService.svc/rest/Cancel",
  flightCancellationCharges: "/AirAPI_V10/AirService.svc/rest/GetCancellationCharges",
  flightSendChangeRequest:
    "/AirAPI_V10/AirService.svc/rest/SendChangeRequest",
  flightGetChangeRequestStatus:
    "/AirAPI_V10/AirService.svc/rest/GetChangeRequestStatus",
  flightReleasePNR:
    "/AirAPI_V10/AirService.svc/rest/ReleasePNRRequest",
};

const bookingEndpoints = new Set([
  "flightBook",
  "flightTicket",
  "flightBookingDetails",
  "flightCancel",
  "flightCancellationCharges",
  "flightSendChangeRequest",
  "flightGetChangeRequestStatus",
  "flightReleasePNR",
]);

const sharedEndpoints = new Set(["authenticate", "getAgencyBalance"]);

const config = {
  timeout: 500000,

  /* ---------------- COMMON ---------------- */
  common: {
    base: process.env.TBO_API_URL || "https://api.tektravels.com",
    sharedBase: "https://Sharedapi.tektravels.com",

    airService: "/BookingEngineService_Air/AirService.svc/rest",
    sharedService: "/SharedData.svc/rest",
  },

  /* ---------------- DUMMY (SEARCH ONLY) ---------------- */
  dummy: {
    base: "https://api.tektravels.com",
    bookingBase: "https://api.tektravels.com",
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

    endpoints: sandboxEndpoints,
  },

  /* ---------------- LIVE (TEST / PROD) ---------------- */
  live: {
    base: isProdTbo
      ? "https://tboapi.travelboutiqueonline.com"
      : "https://api.tektravels.com",
    bookingBase: isProdTbo
      ? "https://booking.travelboutiqueonline.com"
      : "https://api.tektravels.com",
    sharedBase: isProdTbo
      ? "https://api.travelboutiqueonline.com/SharedAPI"
      : "https://Sharedapi.tektravels.com",

    endUserIp: isProdTbo
      ? process.env.TBO_PROD_END_USER_IP
      : process.env.TBO_END_USER_IP,

    credentials: {
      username: isProdTbo
        ? process.env.TBO_PROD_USERNAME
        : process.env.TBO_LIVE_USERNAME,
      password: isProdTbo
        ? process.env.TBO_PROD_PASSWORD
        : process.env.TBO_LIVE_PASSWORD,
      clientId: isProdTbo
        ? process.env.TBO_PROD_CLIENT_ID
        : process.env.TBO_LIVE_CLIENT_ID,
    },

    tokens: {
      tokenId: process.env.TBO_LIVE_TOKEN_ID,
      agencyId: process.env.TBO_LIVE_TOKEN_AGENCY_ID,
      memberId: process.env.TBO_LIVE_TOKEN_MEMBER_ID,
    },

    endpoints: isProdTbo ? productionEndpoints : sandboxEndpoints,
  },
};

config.resolveUrl = (envKey, endpointKey) => {
  const cfg = config[envKey];

  if (!cfg || !cfg.endpoints) {
    throw new Error(`TBO config missing for env: ${envKey}`);
  }

  const endpoint = cfg.endpoints[endpointKey];

  if (!endpoint) {
    throw new Error(`TBO endpoint "${endpointKey}" missing for env: ${envKey}`);
  }

  if (endpoint.startsWith("http")) return endpoint;

  if (sharedEndpoints.has(endpointKey) && cfg.sharedBase) {
    return `${cfg.sharedBase}${endpoint}`;
  }

  if (bookingEndpoints.has(endpointKey) && cfg.bookingBase) {
    return `${cfg.bookingBase}${endpoint}`;
  }

  return `${cfg.base}${endpoint}`;
};

config.tboMode = tboMode;
config.isProdTbo = isProdTbo;

module.exports = config;
