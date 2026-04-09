//flight.service.js

const axios = require("axios");
const config = require("../../config/tbo.config");
const logger = require("../../utils/logger");
const ApiError = require("../../utils/ApiError");

const BOOKING_ENDPOINTS = new Set([
  "flightBook",
  "flightTicket",
  "flightBookingDetails",
  "flightCancel",
  "flightCancellationCharges",
  "flightSendChangeRequest",
  "flightGetChangeRequestStatus",
  "flightReleasePNR",
]);

const SHARED_ENDPOINTS = new Set(["authenticate", "getAgencyBalance"]);

const getTboEnvKey = () => {
  const envFlag = (process.env.TBO_ENV || process.env.NODE_ENV || "").toLowerCase();

  // Production + test/UAT map to "live" config; anything else falls back to dummy.
  if (
    ["production", "prod", "live", "staging", "test", "uat"].includes(envFlag)
  ) {
    return "live";
  }

  return "dummy";
};

const buildUrl = (envKey, endpointKey) => {
  if (typeof config.resolveUrl === "function") {
    return config.resolveUrl(envKey, endpointKey);
  }

  const cfg = config[envKey];

  if (!cfg || !cfg.endpoints) {
    throw new ApiError(500, `Missing TBO config for env ${envKey}`);
  }

  const endpoint = cfg.endpoints[endpointKey] || endpointKey;

  if (endpoint.startsWith("http")) return endpoint;

  const base =
    BOOKING_ENDPOINTS.has(endpointKey) && cfg.bookingBase
      ? cfg.bookingBase
      : SHARED_ENDPOINTS.has(endpointKey) && cfg.sharedBase
        ? cfg.sharedBase
        : cfg.base;

  return `${base}${endpoint}`;
};

const toTboDate = (value) => {
  if (!value) {
    throw new ApiError(400, `Invalid date value: ${value}`);
  }

  // Case 1: already valid TBO datetime → return as-is
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)
  ) {
    return value;
  }

  // Case 2: ISO string (Mongo / JS)
  if (typeof value === "string" && !isNaN(Date.parse(value))) {
    return new Date(value).toISOString().slice(0, 19);
  }

  // Case 3: Date object
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19);
  }

  throw new ApiError(400, `Invalid TBO date format: ${value}`);
};

class FlightService {
  getEnv() {
    return getTboEnvKey();
  }

  constructor() {
    this.tokens = {
      dummy: { value: null, expiry: 0 },
      live: { value: null, expiry: 0 },
    };
  }

  /* ---------------- TOKEN ---------------- */
  isExpired(token) {
    return !token.value || Date.now() >= token.expiry;
  }

  async authenticate(type) {
    const cfg = config[type];

    try {
      const payload = {
        ClientId: cfg.credentials.clientId,
        UserName: cfg.credentials.username,
        Password: cfg.credentials.password,
        EndUserIp: cfg.endUserIp,
      };

      const url = buildUrl(type, "authenticate");
      const { data } = await axios.post(url, payload, {
        timeout: config.timeout,
      });

      if (data?.Status !== 1 && data?.Status !== "Success") {
        throw new Error(data?.Error?.ErrorMessage || "Auth failed");
      }

      // TBO tokens are short‑lived (typically 20–30 minutes). Cache for 25 minutes to avoid “Invalid Token”.
      this.tokens[type] = {
        value: data.TokenId || data.Token,
        expiry: Date.now() + 25 * 60 * 1000,
      };

      return this.tokens[type].value;
    } catch (err) {
      logger.error(
        `TBO ${type} auth error, err?.response?.data ` || err.message,
      );
      throw new ApiError(500, `TBO ${type} authentication failed`);
    }
  }

  async getToken(type) {
    if (this.isExpired(this.tokens[type])) {
      await this.authenticate(type);
    }
    return this.tokens[type].value;
  }

  /* ---------------- SEARCH (DUMMY) ---------------- */
  /* ---------------- SEARCH (DUMMY) ---------------- */
  // ===============================
  // HELPERS (DO NOT REMOVE)
  // ===============================

  // ===============================
  // SEARCH FLIGHTS
  // ===============================
  async searchFlights(params) {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);

    // const cabinMap = { economy: 2, business: 4, first: 6 };
    const cabinMap = {
      all: 1,
      economy: 2,
      "premium economy": 3,
      business: 4,
      "premium business": 5,
      first: 6,
    };

    const resolveCabinClass = (value) => {
      // ✅ NUMBER (preferred – TBO compliant)
      if (typeof value === "number" && value >= 1 && value <= 6) {
        return value;
      }

      // ✅ STRING (frontend / legacy)
      if (typeof value === "string") {
        const key = value.trim().toLowerCase();
        if (cabinMap[key]) return cabinMap[key];
      }

      // 🔒 SAFE DEFAULT → Economy
      return 2;
    };

    let segments = [];

    if (Number(params.journeyType) === 1) {
      segments.push({
        Origin: params.origin,
        Destination: params.destination,
        PreferredDepartureTime: toTboDate(params.departureDate),
        // FlightCabinClass: cabinMap[params.cabinClass?.toLowerCase()] || 1,
        FlightCabinClass: resolveCabinClass(params.cabinClass),
      });
    }

    if (Number(params.journeyType) === 2) {
      segments.push(
        {
          Origin: params.origin,
          Destination: params.destination,
          PreferredDepartureTime: toTboDate(params.departureDate),
          // FlightCabinClass: cabinMap[params.cabinClass?.toLowerCase()] || 1,
          FlightCabinClass: resolveCabinClass(params.cabinClass),
        },
        {
          Origin: params.destination,
          Destination: params.origin,
          PreferredDepartureTime: toTboDate(params.returnDate),
          // FlightCabinClass: cabinMap[params.cabinClass?.toLowerCase()] || 1,
          FlightCabinClass: resolveCabinClass(params.cabinClass),
        },
      );
    }

    /* ---------- MULTI CITY (🔥 MISSING LOGIC) ---------- */
    if (Number(params.journeyType) === 3) {
      if (!Array.isArray(params.segments) || params.segments.length === 0) {
        throw new ApiError(400, "Multi-city search requires flight segments");
      }

      segments = params.segments.map((seg, index) => {
        if (!seg.origin || !seg.destination || !seg.departureDate) {
          throw new ApiError(400, `Invalid segment at index ${index}`);
        }

        return {
          Origin: seg.origin,
          Destination: seg.destination,
          PreferredDepartureTime: toTboDate(seg.departureDate),
          FlightCabinClass: cabinMap[params.cabinClass?.toLowerCase()] || 1,
        };
      });
    }

    const payload = {
      EndUserIp: cfg.endUserIp,
      TokenId: token,
      AdultCount: Number(params.adults ?? 1),
      ChildCount: Number(params.children ?? 0),
      InfantCount: Number(params.infants ?? 0),
      DirectFlight: Boolean(params.directFlight ?? false),
      OneStopFlight: Boolean(params.oneStop ?? false),
      JourneyType: Number(params.journeyType),
      Segments: segments,
      Sources: null,
    };

    const searchUrl = buildUrl(env, "flightSearch");

    const doSearch = async () =>
      axios.post(searchUrl, payload, { timeout: config.timeout });

    let { data } = await doSearch();

    // Auto-retry once on Invalid Token from TBO
    if (
      data?.Response?.ResponseStatus === 4 &&
      data?.Response?.Error?.ErrorCode === 6
    ) {
      // force refresh token
      this.tokens[env] = { value: null, expiry: 0 };
      const freshToken = await this.getToken(env);
      payload.TokenId = freshToken;
      ({ data } = await doSearch());
    }

    return data;
  }

  /* ---------------- FARE RULE ---------------- */
  async getFareRule(traceId, resultIndex) {
    if (!traceId || !resultIndex) {
      throw new ApiError(400, "traceId and resultIndex are required");
    }

    const env = this.getEnv();

    // Dummy support
    if (env === "dummy") {
      return {
        FareRules: [
          {
            Airline: "AI",
            Origin: "DEL",
            Destination: "BOM",
            FareBasisCode: "Y",
            FareRestriction: "Non Refundable",
            FareRuleDetail: [
              "Cancellation fee applies",
              "Reissue charges applicable",
            ],
          },
        ],
      };
    }

    // LIVE
    return this.postLive(
      "flightFareRule",
      {
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      env,
    );
  }

  /* ---------------- FARE QUOTE ---------------- */
  async getFareQuote(traceId, resultIndex) {
    const env = this.getEnv();

    // Dummy environment
    if (env === "dummy") {
      return {
        Status: 1,
        TraceId: traceId,
        Results: [
          {
            ResultIndex: resultIndex,
            Fare: {
              Currency: "INR",
              BaseFare: 1250,
              Tax: 645,
              PublishedFare: 1895,
              OfferedFare: 1895,
            },
            IsLCC: false,
          },
        ],
      };
    }

    // Live / Test
    return this.postLive(
      "flightFareQuote",
      {
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      env,
    );
  }

  /* ---------------- REAL SSR ---------------- */
  async getSSR(traceId, resultIndex) {
    const env = this.getEnv();

    // Dummy for non-production
    if (env === "dummy") {
      return {
        Status: 1,
        TraceId: traceId,
        Results: {
          Baggage: [],
          Meal: [],
          Seat: [],
        },
      };
    }

    // LIVE SSR
    return this.postLive(
      "flightSSR",
      {
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      env,
    );
  }

  /* ---------------- SEAT MAP ---------------- */
  async getSeatMap(traceId, resultIndex) {
    if (!traceId || !resultIndex) {
      throw new ApiError(400, "traceId and resultIndex are required");
    }

    const env = this.getEnv();

    if (env === "dummy") {
      return {
        Status: 1,
        TraceId: traceId,
        SeatMap: [
          {
            SegmentIndex: 0,
            Seats: [
              {
                Code: "12A",
                SeatType: "WINDOW",
                Price: 0,
                IsBooked: false,
                IsChargeable: false,
              },
              {
                Code: "12B",
                SeatType: "MIDDLE",
                Price: 250,
                IsBooked: false,
                IsChargeable: true,
              },
            ],
          },
        ],
      };
    }

    return this.postLive(
      "flightSeatMap",
      {
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      env,
    );
  }

  /* ---------------- FARE UPSELL ---------------- */
  async getFareUpsell(traceId, resultIndex) {
    if (!traceId || !resultIndex) {
      throw new ApiError(400, "traceId and resultIndex are required");
    }

    const env = this.getEnv();

    // Dummy
    if (env === "dummy") {
      return {
        TraceId: traceId,
        ResultIndex: resultIndex,
        FareFamilies: [
          {
            code: "ECONOMY",
            name: "Economy",
            passengerType: 1,
            price: 0,
            services: [
              {
                code: "SEAT",
                description: "Standard Seat",
                included: true,
              },
            ],
          },
          {
            code: "ECONOMY_PLUS",
            name: "Economy Plus",
            passengerType: 1,
            price: 899,
            services: [
              {
                code: "SEAT",
                description: "Free Seat Selection",
                included: true,
              },
              {
                code: "BAG",
                description: "Extra Baggage",
                included: true,
              },
            ],
          },
        ],
      };
    }

    // LIVE
    const response = await this.postLive(
      "flightFareUpsell",
      { TraceId: traceId, ResultIndex: resultIndex },
      env,
    );
    const upsellList = response?.UpsellOptionsList?.UpsellList || [];

    return {
      TraceId: traceId,
      ResultIndex: resultIndex,
      FareFamilies: upsellList.map((u) => ({
        code: u.FareFamilyCode,
        name: u.FareFamilyName,
        passengerType: u.PassengerType,
        price: u.Price || 0,
        services: (u.ServicesList || []).map((s) => ({
          code: s.Code,
          description: s.UpsellDescription,
          included: s.IsIncluded,
          chargeable: s.IsChargeable,
        })),
      })),
    };
  }

  /* ---------------- BOOK (NON-LCC) ---------------- */
  async bookFlight({ traceId, resultIndex, result, passengers, ssr }) {
    if (!result) {
      throw new ApiError(400, "Selected flight result is required");
    }

    const env = this.getEnv();

    if (typeof resultIndex !== "string") {
      throw new ApiError(
        500,
        "Invalid ResultIndex passed to TBO Book API (must be string)",
      );
    }

    if (!Array.isArray(result.FareBreakdown) || !result.FareBreakdown.length) {
      throw new ApiError(400, "FareBreakdown missing");
    }

    const totalFareBreakdownCount = result.FareBreakdown.reduce(
      (sum, fb) => sum + (Number(fb.PassengerCount) || 0),
      0,
    );

    if (!result.IsLCC && totalFareBreakdownCount > 0) {
      if (passengers.length !== totalFareBreakdownCount) {
        throw new ApiError(
          400,
          `Passenger count (${passengers.length}) does not match FareBreakdown (${totalFareBreakdownCount})`,
        );
      }
    }

    // Map pax type to fare breakdown for non-LCC bookings
    const paxTypeToFare = {};
    result.FareBreakdown.forEach((fb) => {
      paxTypeToFare[fb.PassengerType] = fb;
    });

    const getFareForPassenger = (p) => {
      if (result.IsLCC) return result.FareBreakdown[0];

      const paxType = (p.paxType || p.PaxType || "").toString().toUpperCase();
      const tboCode =
        paxType === "ADULT"
          ? 1
          : paxType === "CHILD"
            ? 2
            : paxType === "INFANT"
              ? 3
              : null;

      return paxTypeToFare[tboCode] || result.FareBreakdown[0];
    };

    const payload = {
      TraceId: traceId,
      ResultIndex: resultIndex,
      IsLCC: result.IsLCC,
      Fare: result.Fare,
      Passengers: passengers.map((p) => ({
        ...this.mapPassenger(p),
        Fare: getFareForPassenger(p),
      })),
      SSR:
        ssr && (ssr.baggage?.length || ssr.meals?.length || ssr.seats?.length)
          ? {
              Baggage: ssr.baggage || [],
              Meal: ssr.meals || [],
              Seat: ssr.seats || [],
            }
          : null,
    };

    logger.info("TBO BOOK PAYLOAD", JSON.stringify(payload, null, 2));

    const response = await this.postLive("flightBook", payload, env);

    if (response?.Response?.ResponseStatus !== 1) {
      throw new ApiError(
        400,
        response?.Response?.Error?.ErrorMessage || "Booking failed",
      );
    }

    const itinerary = response.Response?.FlightItinerary || {};

    const segments = itinerary?.Segments?.flat() || [];

    const hasNN = segments.some((s) => s.Status === "NN");
    const hasHK = segments.every((s) => s.Status === "HK");

    /* 🔁 HANDLE NN (WAIT & RETRY USING BOOKING DETAILS) */
    if (hasNN) {
      logger.warn("⚠️ NN STATUS DETECTED - WAITING FOR CONFIRMATION");

      const pnr = itinerary?.PNR;

      if (!pnr) {
        throw new ApiError(500, "PNR missing for NN booking");
      }

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 3000));

        const details = await this.getBookingDetails(pnr);

        const retrySegments =
          details?.Response?.Response?.FlightItinerary?.Segments?.flat() || [];

        const nowHK = retrySegments.every((s) => s.Status === "HK");

        if (nowHK) {
          logger.info("✅ STATUS UPDATED TO HK");

          return {
            bookingId: itinerary.BookingId,
            pnr,
            raw: details,
          };
        }

        attempts++;
      }

      /* ❌ STILL NN AFTER RETRY */
      throw new ApiError(400, `Flight not confirmed (still NN after retry)`);
    }

    return {
      bookingId: itinerary.BookingId || null,
      pnr: itinerary.PNR || null,
      raw: response,
    };
  }

  /* ---------------- TICKET ---------------- */
  async ticketFlight({
    traceId,
    resultIndex,
    bookingId,
    pnr,
    passengers,
    isLCC,
  }) {
    const env = this.getEnv();

    let payload = {};

    /* ================= LCC ================= */
    if (isLCC) {
      if (!traceId || !resultIndex) {
        throw new ApiError(
          400,
          "traceId and resultIndex are required for LCC ticketing",
        );
      }

      payload = {
        TraceId: traceId,
        ResultIndex: resultIndex,

        // 🔥 MOST IMPORTANT FIX
        Passengers: passengers.map((p) => ({
          ...this.mapPassenger(p),

          // 🔥 REQUIRED FOR LCC
         Fare: {
  BaseFare: p.fare?.BaseFare || 0,
  Tax: p.fare?.Tax || 0,
  YQTax: p.fare?.YQTax || 0,
  AdditionalTxnFeePub: 0,
  AdditionalTxnFeeOfrd: 0,
  OtherCharges: 0,
},
        })),
      };
    } else {
      /* ================= NON-LCC ================= */
      if (!bookingId || !pnr) {
        throw new ApiError(
          400,
          "BookingId and PNR required for Non-LCC ticketing",
        );
      }

      payload = {
        TraceId: traceId, // ✅ REQUIRED
        BookingId: bookingId,
        PNR: pnr,
      };

      /* 🔥 PASSPORT BLOCK (IMPORTANT) */
      if (passengers?.length) {
        payload.Passport = passengers.map((p, i) => ({
          PaxId: p.paxId, // ⚠️ MUST come from BOOK RESPONSE
          PassportNo: p.passportNo,
          PassportIssueDate: p.PassportIssueDate,
          PassportExpiry: p.passportExpiry,
          DateOfBirth: p.dateOfBirth,
        }));
      }
    }

    logger.info("TBO TICKET PAYLOAD", payload);

    const response = await this.postLive("flightTicket", payload, env);

    if (response?.Response?.ResponseStatus !== 1) {
      throw new ApiError(
        400,
        response?.Response?.Error?.ErrorMessage || "Ticketing failed",
      );
    }

    return response;
  }
  /* ---------------- BOOKING DETAILS ---------------- */
  async getBookingDetails(pnr) {
    if (!pnr) {
      throw new ApiError(400, "PNR is required to fetch booking details");
    }

    const env = this.getEnv();

    return this.postLive("flightBookingDetails", { PNR: pnr }, env);
  }

  /* ---------------- PASSENGER MAPPER ---------------- */
  // mapPassenger(pax) {
  //   return {
  //     Title: pax.title,
  //     FirstName: pax.firstName,
  //     LastName: pax.lastName,

  //     PaxType:
  //       pax.paxType === "ADULT" || pax.paxType === 1
  //         ? 1
  //         : pax.paxType === "CHILD" || pax.paxType === 2
  //           ? 2
  //           : 3,

  //     DateOfBirth: pax.dateOfBirth
  //       ? new Date(pax.dateOfBirth).toISOString().split("T")[0]
  //       : null,

  //     Gender: pax.gender === "Male" || pax.gender === 1 ? 1 : 2,

  //     PassportNo: pax.passportNo || "",
  //     PassportExpiry: pax.passportExpiry || "",

  //     AddressLine1: "NA",
  //     City: "DELHI",
  //     CountryCode: "356",
  //     CountryName: "India",

  //     ContactNo: pax.contactNo,
  //     Email: pax.email,
  //     IsLeadPax: pax.isLeadPax === true,
  //     Nationality: "IN",
  //   };
  // }

  mapPassenger(pax) {
    const nationalityCode = (pax.nationality || "IN").toUpperCase();
    return {
      Title: pax.title,
      FirstName: pax.firstName,
      LastName: pax.lastName,

      PaxType:
        pax.paxType === "ADULT" || pax.paxType === 1
          ? 1
          : pax.paxType === "CHILD" || pax.paxType === 2
            ? 2
            : 3,

      DateOfBirth: pax.dateOfBirth
        ? new Date(pax.dateOfBirth).toISOString().split("T")[0]
        : null,

      Gender:
        pax.gender === "Male" || pax.gender === "MALE" || pax.gender === 1
          ? 1
          : 2,

      PassportNo: pax.passportNo || "",
      PassportIssueDate: pax.PassportIssueDate || "",
      PassportExpiry: pax.passportExpiry || "",

      PassportIssueCountryCode: nationalityCode,
      PassportIssueCountry: nationalityCode,

      /* ===============================
       🔥 DYNAMIC ADDRESS SUPPORT
    =============================== */

      AddressLine1: pax.addressLine1 || pax.AddressLine1 || "NA",

      City: pax.city || pax.City || "DELHI",

      CountryCode: pax.countryCode || pax.CountryCode || "IN",

      CountryName: pax.countryName || pax.CountryName || "India",

      /* =============================== */

      ContactNo: pax.contactNo,
      Email: pax.email,
      IsLeadPax: pax.isLeadPax === true,
      Nationality: nationalityCode,
    };
  }

  /* ---------------- LIVE POST ---------------- */
  async postLive(endpoint, payload, type = "live") {
    const envKey = type || "live";
    const cfg = config[envKey];

    if (!cfg) {
      throw new ApiError(500, `Missing TBO config for env ${envKey}`);
    }

    const hasEndpointKey =
      cfg.endpoints &&
      Object.prototype.hasOwnProperty.call(cfg.endpoints, endpoint);

    const url = hasEndpointKey
      ? buildUrl(envKey, endpoint)
      : endpoint.startsWith("http")
        ? endpoint
        : `${cfg.base}${endpoint}`;

    const token = await this.getToken(envKey);

    try {
      const { data } = await axios.post(
        url,
        {
          EndUserIp: cfg.endUserIp,
          TokenId: token,
          ...payload,
        },
        { timeout: config.timeout },
      );
      return data;
    } catch (err) {
      logger.error("TBO ERROR", {
        env: envKey,
        url,
        status: err.response?.status,
        data: err.response?.data,
        payload,
      });

      throw new ApiError(
        500,
        err.response?.data?.Response?.Error?.ErrorMessage ||
          err.response?.data?.Error?.ErrorMessage ||
          "TBO live request failed",
      );
    }
  }
}

module.exports = new FlightService();



