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
  const envFlag = (
    process.env.TBO_ENV ||
    process.env.NODE_ENV ||
    ""
  ).toLowerCase();

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

const normalizeAmount = (value) => Number(value || 0);

const getPassengerTypeCode = (paxType) => {
  const value = String(paxType || "").toUpperCase();

  if (value === "1" || value === "ADULT") return 1;
  if (value === "2" || value === "CHILD") return 2;
  if (value === "3" || value === "INFANT") return 3;

  return 1;
};

const toTboFare = (fare = {}, currency = "INR") => ({
  Currency: fare.Currency || currency,
  BaseFare: normalizeAmount(fare.BaseFare),
  Tax: normalizeAmount(fare.Tax),
  YQTax: normalizeAmount(fare.YQTax),
  TransactionFee: normalizeAmount(fare.TransactionFee),
  AdditionalTxnFeePub: normalizeAmount(fare.AdditionalTxnFeePub),
  AdditionalTxnFeeOfrd: normalizeAmount(fare.AdditionalTxnFeeOfrd),
  OtherCharges: normalizeAmount(fare.OtherCharges),
  AirTransFee: normalizeAmount(fare.AirTransFee),
  PublishedFare: normalizeAmount(
    fare.PublishedFare ||
      normalizeAmount(fare.BaseFare) +
        normalizeAmount(fare.Tax) +
        normalizeAmount(fare.YQTax) +
        normalizeAmount(fare.OtherCharges),
  ),
  OfferedFare: normalizeAmount(fare.OfferedFare || fare.PublishedFare),
});

const getFareForPassenger = (result, passenger) => {
  const fareBreakdown = Array.isArray(result?.FareBreakdown)
    ? result.FareBreakdown
    : [];

  const paxType = getPassengerTypeCode(
    passenger?.paxType || passenger?.PaxType,
  );
  const matchedFare = fareBreakdown.find(
    (fare) => Number(fare?.PassengerType) === paxType,
  );

  return toTboFare(
    matchedFare || fareBreakdown[0] || result?.Fare,
    result?.Fare?.Currency,
  );
};

const getLccFareForPassenger = (result, passenger) => {
  const inlineFare = passenger?.Fare || passenger?.fare;

  if (inlineFare) {
    return toTboFare(inlineFare, inlineFare.Currency || result?.Fare?.Currency);
  }

  return getFareForPassenger(result, passenger);
};

function buildLccTicketSsrPayload({ ssr, liveSsrResponse, passengers }) {
  // const allMeals = ssrResponse.MealDynamic.flat();
  const mealOptions = [...(liveSsrResponse?.Response?.MealDynamic?.flat() || [])];

  const seatOptions = [...(
    liveSsrResponse?.Response?.SeatDynamic?.flatMap((seg) =>
      seg.SegmentSeat?.flatMap((s) =>
        s.RowSeats?.flatMap((r) => 
          (r.Seats || []).map(seatObj => ({
            ...seatObj,
            WayType: seg.SegmentSeat[0]?.WayType || s.WayType || 1,
            AirlineCode: s.AirlineCode || seatObj.AirlineCode,
            FlightNumber: s.FlightNumber || seatObj.FlightNumber
          }))
        ),
      ),
    ) || []
  )];

  const baggageOptions = [...(liveSsrResponse?.Response?.Baggage?.flat() || [])];

  const MealDynamic = (ssr?.meals || []).map((m) => {
    // 1. Try strict match using generated journeyType (WayType 1 vs 2) + Code
    // 2. Fallback to just Code if journeyType is missing from older DB schemas
    const expectedWayType = m.journeyType === "return" ? 2 : (m.journeyType === "onward" ? 1 : null);
    
    let idx = mealOptions.findIndex(
      (opt) => String(opt.Code).trim() === String(m.code).trim() && (expectedWayType ? Number(opt.WayType) === expectedWayType : true)
    );
    
    // Fallback if strict WayType match failed but the code exists
    if (idx === -1) {
      idx = mealOptions.findIndex((opt) => String(opt.Code).trim() === String(m.code).trim());
    }

    if (idx === -1) {
      throw new Error(`Meal code ${m.code} not found in SSR response`);
    }
    
    const matched = mealOptions[idx];

    return {
      travelerIndex: m.travelerIndex,
      AirlineCode: matched.AirlineCode,
      FlightNumber: matched.FlightNumber,
      WayType: expectedWayType || matched.WayType || 1,
      Code: matched.Code, // ✅ REQUIRED
      Description: Number(matched.Code) || 0, // ✅ REQUIRED
      Origin: matched.Origin,
      Destination: matched.Destination,
      Amount: matched.Price || 0,
      Currency: "INR",
    };
  });

  const SeatDynamic = (ssr?.seats || []).map((s) => {
    const expectedWayType = s.journeyType === "return" ? 2 : (s.journeyType === "onward" ? 1 : null);

    let idx = seatOptions.findIndex(
      (opt) => (String(opt.Code).trim() === String(s.seatNo).trim() || `${opt.RowNo}${opt.ColumnNo}`.trim() === String(s.seatNo).trim()) &&
               (expectedWayType ? Number(opt.SeatWayType || opt.WayType) === expectedWayType : true)
    );

    if (idx === -1) {
      idx = seatOptions.findIndex(
        (opt) => String(opt.Code).trim() === String(s.seatNo).trim() || `${opt.RowNo}${opt.ColumnNo}`.trim() === String(s.seatNo).trim()
      );
    }

    if (idx === -1) {
      throw new Error(`Seat ${s.seatNo} not found in SSR`);
    }
    
    const matched = seatOptions[idx];

    // ✅ ADD THIS
    return {
      travelerIndex: s.travelerIndex,
      AirlineCode: matched.AirlineCode || "",
      FlightNumber: matched.FlightNumber || "",
      WayType: expectedWayType || matched.WayType || matched.SeatWayType || 1,
      Code: matched.Code,
      Description: Number(matched.Code) || 0,
      Origin: matched.Origin,
      Destination: matched.Destination,
      Amount: matched.Price || 0,
      Currency: "INR",
    };
  });

  const Baggage = (ssr?.baggage || []).map((b) => {
    const expectedWayType = b.journeyType === "return" ? 2 : (b.journeyType === "onward" ? 1 : null);

    let idx = baggageOptions.findIndex(
      (opt) => String(opt.Code).trim() === String(b.code).trim() && (expectedWayType ? Number(opt.WayType) === expectedWayType : true)
    );

    if (idx === -1) {
       idx = baggageOptions.findIndex((opt) => String(opt.Code).trim() === String(b.code).trim());
    }

    if (idx === -1) {
      throw new Error(`Invalid baggage code ${b.code}`);
    }

    const matched = baggageOptions[idx];

    return {
      travelerIndex: b.travelerIndex || b.segmentIndex || 0, // Fallback if missing
      AirlineCode: matched.AirlineCode,
      FlightNumber: matched.FlightNumber,
      WayType: expectedWayType || matched.WayType || 1,
      Code: matched.Code,
      Description: matched.Description,
      Weight: matched.Weight ? Number(matched.Weight) : 0,
      Origin: matched.Origin,
      Destination: matched.Destination,
      Amount: matched.Price || 0,
      Currency: "INR",
    };
  });

  return {
    MealDynamic,
    SeatDynamic,
    Baggage,
  };
}

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

      logger.info("TBO AUTH CALL", {
        env: type,
        url,
        username: payload.UserName,
        clientId: payload.ClientId,
        endUserIp: payload.EndUserIp,
      });

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

  /* ---------------- SEARCH ---------------- */
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

    const cabinMap = {
      all: 1,
      economy: 2,
      premium_economy: 3,
      business: 4,
      premium_business: 5,
      first_class: 6,
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

    logger.info("TBO FLIGHT SEARCH CALL", {
      env,
      url: searchUrl,
      username: cfg.credentials?.username,
      clientId: cfg.credentials?.clientId,
      endUserIp: cfg.endUserIp,
      journeyType: params.journeyType,
    });
    logger.info("TBO FLIGHT SEARCH PAYLOAD", {
      payload
    });

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

    // 🔸 Log request
    logger.info("TBO FARE UPSELL REQUEST", {
      traceId,
      resultIndex,
      env,
    });

    const response = await this.postLive(
      "flightFareUpsell",
      { TraceId: traceId, ResultIndex: resultIndex },
      env,
    );

    // 🔥 FULL RAW RESPONSE LOG (MAIN DEBUG)
    logger.info(
      "TBO FARE UPSELL RESPONSE:\n" + JSON.stringify(response, null, 2),
    );

    // 🔥 ERROR HANDLING (IMPORTANT)
    if (response?.Response?.ResponseStatus !== 1) {
      logger.error("TBO FARE UPSELL ERROR", {
        traceId,
        resultIndex,
        error: response?.Response?.Error,
      });
    }

    return response;
  }

  /* ---------------- BOOK (NON-LCC) ---------------- */
  async bookFlight({ traceId, resultIndex, result, passengers, ssr, gstDetails }) {
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
      ...(gstDetails?.gstin && {
        GSTCompanyInformation: {
          GSTNumber: gstDetails.gstin || "",
          GSTCompanyName: gstDetails.legalName || "NA",
          GSTCompanyAddress: gstDetails.address || "NA",
          GSTCompanyEmail: gstDetails.gstEmail || passengers[0]?.email || "info@domain.com"
        }
      }),
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
    result,
    ssr,
    isLCC,
    gstDetails,
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

      if (!Array.isArray(passengers) || passengers.length === 0) {
        throw new ApiError(
          400,
          "At least one passenger is required for LCC ticketing",
        );
      }

      if (
        !result &&
        !passengers.every((passenger) => passenger?.Fare || passenger?.fare)
      ) {
        throw new ApiError(
          400,
          "Selected fare result or passenger fare details are required for LCC ticketing",
        );
      }

      if (
        (ssr?.seats?.length || 0) > 0 ||
        (ssr?.meals?.length || 0) > 0 ||
        (ssr?.baggage?.length || 0) > 0
      ) {
        logger.warn(
          "LCC SSR selections are present but not yet mapped into TBO passenger SSR payload",
          {
            seatCount: ssr?.seats?.length || 0,
            mealCount: ssr?.meals?.length || 0,
            baggageCount: ssr?.baggage?.length || 0,
          },
        );
      }

      let lccSsrPayload = {
        MealDynamic: [],
        SeatDynamic: [],
        Baggage: [],
      };

      if (
        (ssr?.meals?.length || 0) > 0 ||
        (ssr?.seats?.length || 0) > 0 ||
        (ssr?.baggage?.length || 0) > 0
      ) {
        logger.info("BUILDING SSR PAYLOAD FOR LCC", {
          mealCount: ssr?.meals?.length || 0,
          seatCount: ssr?.seats?.length || 0,
          baggageCount: ssr?.baggage?.length || 0,
        });

        const liveSsr = await this.getSSR(traceId, resultIndex);

        lccSsrPayload = buildLccTicketSsrPayload({
          ssr,
          liveSsrResponse: liveSsr,
          passengers,
        });

        // 🚨 STEP 2: ADD THIS EXACT BLOCK HERE (IMPORTANT)
        if (lccSsrPayload.MealDynamic.some((m) => !m.Code)) {
          throw new Error(
            "Invalid MealDynamic payload (Code/Description missing)",
          );
        }

        if (lccSsrPayload.SeatDynamic.some((s) => !s.Code)) {
          throw new Error("Invalid SeatDynamic payload (Code missing)");
        }
      }

      logger.info("FINAL SSR PAYLOAD", lccSsrPayload);

      payload = {
        TraceId: traceId,
        ResultIndex: resultIndex,

        IsPriceChanged: false, // ✅ ADD THIS
        IsBookAndTicket: true, // ✅ ADD THIS (CRITICAL)

        // 🔥 MOST IMPORTANT FIX
        Passengers: passengers.map((p, pIndex) => ({
          ...this.mapPassenger(p),

          // 🔥 REQUIRED FOR LCC
          Fare: getLccFareForPassenger(result, p),
          MealDynamic: (lccSsrPayload.MealDynamic || [])
            .filter((m) => m.travelerIndex === pIndex)
            .map(({ travelerIndex, ...rest }) => rest),
            
          SeatDynamic: (lccSsrPayload.SeatDynamic || [])
            .filter((s) => s.travelerIndex === pIndex)
            .map(({ travelerIndex, ...rest }) => rest),
            
          Baggage: (lccSsrPayload.Baggage || [])
            .filter((b) => b.travelerIndex === pIndex)
            .map(({ travelerIndex, ...rest }) => rest),
        })),
        ...(gstDetails?.gstin && {
          GSTCompanyInformation: {
            GSTNumber: gstDetails.gstin || "",
            GSTCompanyName: gstDetails.legalName || "NA",
            GSTCompanyAddress: gstDetails.address || "NA",
            GSTCompanyEmail: gstDetails.gstEmail || passengers[0]?.email || "info@domain.com"
          }
        }),
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
      logger.info("TBO LIVE CALL", {
        env: envKey,
        endpoint,
        url,
        username: cfg.credentials?.username,
        clientId: cfg.credentials?.clientId,
        endUserIp: cfg.endUserIp,
      });

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
