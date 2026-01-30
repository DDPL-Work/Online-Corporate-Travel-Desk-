//flight.service.js

const axios = require("axios");
const config = require("../../config/tbo.config");
const logger = require("../../utils/logger");
const ApiError = require("../../utils/ApiError");

const toTboDate = (date) => {
  if (!date || typeof date !== "string") {
    throw new ApiError(400, `Invalid date value: ${date}`);
  }

  const clean = date.trim(); // remove hidden spaces
  const tboDate = `${clean}T00:00:00`;

  const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
  if (!regex.test(tboDate)) {
    throw new ApiError(400, ` Invalid TBO date format: ${tboDate}`);
  }

  return tboDate;
};

class FlightService {
  getEnv() {
    return process.env.NODE_ENV === "production" ? "live" : "dummy";
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

      const url = `${cfg.sharedBase || cfg.base}${cfg.endpoints.authenticate}`;
      const { data } = await axios.post(url, payload, {
        timeout: config.timeout,
      });

      if (data?.Status !== 1 && data?.Status !== "Success") {
        throw new Error(data?.Error?.ErrorMessage || "Auth failed");
      }

      this.tokens[type] = {
        value: data.TokenId || data.Token,
        expiry: Date.now() + 24 * 60 * 60 * 1000,
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

    const cabinMap = { economy: 2, business: 4, first: 6 };
    let segments = [];

    if (Number(params.journeyType) === 1) {
      segments.push({
        Origin: params.origin,
        Destination: params.destination,
        PreferredDepartureTime: toTboDate(params.departureDate),
        FlightCabinClass: cabinMap[params.cabinClass?.toLowerCase()] || 1,
      });
    }

    if (Number(params.journeyType) === 2) {
      segments.push(
        {
          Origin: params.origin,
          Destination: params.destination,
          PreferredDepartureTime: toTboDate(params.departureDate),
          FlightCabinClass: cabinMap[params.cabinClass?.toLowerCase()] || 1,
        },
        {
          Origin: params.destination,
          Destination: params.origin,
          PreferredDepartureTime: toTboDate(params.returnDate),
          FlightCabinClass: cabinMap[params.cabinClass?.toLowerCase()] || 1,
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

    const { data } = await axios.post(
      `${cfg.base}${cfg.endpoints.flightSearch}`,
      payload,
      { timeout: config.timeout },
    );

    return data;
  }

  /* ---------------- FARE RULE ---------------- */
  async getFareRule(traceId, resultIndex) {
    if (!traceId || !resultIndex) {
      throw new ApiError(400, "traceId and resultIndex are required");
    }

    // Dummy support
    if (process.env.NODE_ENV !== "production") {
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
      "/BookingEngineService_Air/AirService.svc/rest/FareRule",
      {
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      "live",
    );
  }

  /* ---------------- FARE QUOTE ---------------- */
  async getFareQuote(traceId, resultIndex) {
    // 🔹 Dummy environment
    if (process.env.NODE_ENV !== "production") {
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

    // 🔹 Live
    return this.postLive(
      config.live.endpoints.flightFareQuote,
      {
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      "live",
    );
  }

  /* ---------------- REAL SSR ---------------- */
  async getSSR(traceId, resultIndex) {
    // Dummy for non-production
    if (process.env.NODE_ENV !== "production") {
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
      config.live.endpoints.flightSSR,
      {
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      "live",
    );
  }

  /* ---------------- SEAT MAP ---------------- */
  async getSeatMap(traceId, resultIndex) {
    if (!traceId || !resultIndex) {
      throw new ApiError(400, "traceId and resultIndex are required");
    }

    // 🔹 Dummy environment
    if (process.env.NODE_ENV !== "production") {
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

    // 🔹 LIVE Seat Map
    return this.postLive(
      config.live.endpoints.flightSeatMap,
      {
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      "live",
    );
  }

  /* ---------------- FARE UPSELL ---------------- */
  async getFareUpsell(traceId, resultIndex) {
    if (!traceId || !resultIndex) {
      throw new ApiError(400, "traceId and resultIndex are required");
    }

    // Dummy
    if (process.env.NODE_ENV !== "production") {
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
      "/BookingEngineService_Air/AirService.svc/rest/FareUpsell",
      { TraceId: traceId, ResultIndex: resultIndex },
      "live",
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

    if (!Array.isArray(result.FareBreakdown) || !result.FareBreakdown.length) {
      throw new ApiError(400, "FareBreakdown missing");
    }

    if (!result.IsLCC && passengers.length !== result.FareBreakdown.length) {
      throw new ApiError(
        400,
        `Passenger count (${passengers.length}) does not match FareBreakdown (${result.FareBreakdown.length})`,
      );
    }

    const payload = {
      TraceId: traceId,
      ResultIndex: resultIndex,
      IsLCC: result.IsLCC,
      Fare: result.Fare,
      Passengers: passengers.map((p, i) => ({
        ...this.mapPassenger(p),
        Fare: result.IsLCC ? result.FareBreakdown[0] : result.FareBreakdown[i],
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

    const response = await this.postLive(
      config.live.endpoints.flightBook,
      payload,
      "live",
    );

    if (response?.Response?.ResponseStatus !== 1) {
      throw new ApiError(
        400,
        response?.Response?.Error?.ErrorMessage || "Booking failed",
      );
    }

    const itinerary = response.Response?.FlightItinerary || {};

    return {
      bookingId: itinerary.BookingId || null,
      pnr: itinerary.PNR || null,
      raw: response,
    };
  }

  /* ---------------- TICKET ---------------- */

  /* ---------------- TICKET ---------------- */
  async ticketFlight({ traceId, resultIndex, bookingId, pnr, isLCC }) {
    let payload;

    if (isLCC) {
      // ✅ LCC → NO PNR, NO BOOKING ID
      if (!traceId || !resultIndex) {
        throw new ApiError(
          400,
          "traceId and resultIndex are required for LCC ticketing",
        );
      }

      payload = {
        TraceId: traceId,
        ResultIndex: resultIndex,
      };
    } else {
      // ✅ Non-LCC → requires BookingId or PNR
      if (!bookingId && !pnr) {
        throw new ApiError(
          400,
          "bookingId or pnr required for Non-LCC ticketing",
        );
      }

      payload = {
        BookingId: bookingId,
        PNR: pnr,
      };
    }

    logger.info(
      "TBO TICKET PAYLOAD",
      JSON.stringify({ isLCC, payload }, null, 2),
    );

    return this.postLive(config.live.endpoints.flightTicket, payload, "live");
  }

  /* ---------------- BOOKING DETAILS ---------------- */
  async getBookingDetails(pnr) {
    if (!pnr) {
      throw new ApiError(400, "PNR is required to fetch booking details");
    }

    return this.postLive(
      config.live.endpoints.flightBookingDetails,
      { PNR: pnr },
      "live",
    );
  }

  /* ---------------- PASSENGER MAPPER ---------------- */
  mapPassenger(pax) {
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

      Gender: pax.gender === "Male" || pax.gender === 1 ? 1 : 2,

      PassportNo: pax.passportNo || "",
      PassportExpiry: pax.passportExpiry || "",

      AddressLine1: "NA",
      City: "DELHI",
      CountryCode: "356",
      CountryName: "India",

      ContactNo: pax.contactNo,
      Email: pax.email,
      IsLeadPax: pax.isLeadPax === true,
      Nationality: "IN",
    };
  }

  /* ---------------- LIVE POST ---------------- */
  async postLive(endpoint, payload, type = "live") {
    const token = await this.getToken(type);

    try {
      const { data } = await axios.post(
        `${type === "live" ? config.live.base : config.dummy.base}${endpoint}`,
        {
          EndUserIp:
            type === "live" ? config.live.endUserIp : config.dummy.endUserIp,
          TokenId: token,
          ...payload,
        },
        { timeout: config.timeout },
      );
      return data;
    } catch (err) {
      logger.error("TBO ERROR", {
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
