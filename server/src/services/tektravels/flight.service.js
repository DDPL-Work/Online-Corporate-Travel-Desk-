const axios = require("axios");
const config = require("../../config/tbo.config");
const logger = require("../../utils/logger");
const ApiError = require("../../utils/ApiError");

class FlightService {
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
        `TBO ${type} auth error`,
        err?.response?.data || err.message
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
  async searchFlights(params) {
    const token = await this.getToken("dummy");

    const cabinMap = { economy: 1, business: 2, first: 3 };

    const payload = {
      EndUserIp: config.dummy.endUserIp,
      TokenId: token,

      AdultCount: Number(params.adults ?? 1),
      ChildCount: Number(params.children ?? 0),
      InfantCount: Number(params.infants ?? 0),

      DirectFlight: Boolean(params.directFlight ?? false),
      OneStopFlight: Boolean(params.oneStop ?? false),
      JourneyType: Number(params.journeyType ?? 1),

      Segments: [
        {
          Origin: params.origin,
          Destination: params.destination,
          PreferredDepartureTime: "00:00:00",
          FlightCabinClass: cabinMap[params.cabinClass?.toLowerCase()] || 1,
        },
      ],
      Sources: null,
    };

    try {
      const { data } = await axios.post(
        `${config.dummy.base}${config.dummy.endpoints.flightSearch}`,
        payload,
        { timeout: config.timeout }
      );
      return data;
    } catch (err) {
      logger.error("TBO search error", err?.response?.data || err.message);
      throw new ApiError(500, "TBO flight search failed");
    }
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
      "live"
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
      "live"
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
      "live"
    );
  }

  /* ---------------- FARE UPSELL ---------------- */
  async getFareUpsell(traceId, resultIndex) {
    if (!traceId || !resultIndex) {
      throw new ApiError(400, "traceId and resultIndex are required");
    }

    // Dummy support
    if (process.env.NODE_ENV !== "production") {
      return {
        TraceId: traceId,
        ResponseStatus: 1,
        IsPriceChanged: false,
        UpsellOptionsList: {
          UpsellList: [
            {
              FareFamilyCode: "ECONOMY_PLUS",
              FareFamilyName: "Economy Plus",
              PassengerType: 1,
              ServicesList: [
                {
                  Code: "SEAT",
                  IsChargeable: false,
                  IsIncluded: true,
                  ServiceType: "Seat",
                  SSRCode: "SEAT",
                  UpsellDescription: "Free Seat Selection",
                },
              ],
            },
          ],
        },
      };
    }

    // LIVE FARE UPSELL
    return this.postLive(
      "/BookingEngineService_Air/AirService.svc/rest/FareUpsell",
      {
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      "live"
    );
  }

  /* ---------------- SEAT MAP ---------------- */
  async getSeatMap(traceId, resultIndex, isLCC) {
    if (!traceId || !resultIndex) {
      throw new ApiError(400, "traceId and resultIndex are required");
    }

    return this.postLive(
      config.live.endpoints.flightSeatMap,
      {
        TraceId: traceId,
        ResultIndex: resultIndex,
        IsLCC: Boolean(isLCC), // ✅ FIXED
        SegmentIndex: 0,
      },
      "live"
    );
  }

  /* ---------------- BOOK (NON-LCC HOLDservice) ---------------- */
  async bookFlight({ traceId, resultIndex, fareQuote, passengers }) {
    // 🔹 Extract main fare object
    const fare = fareQuote?.Results?.[0]?.Fare;
    if (!fare) throw new ApiError(400, "Fare is missing from fareQuote");

    const payload = {
      TraceId: traceId,
      ResultIndex: resultIndex,
      IsLCC: false,
      Fare: fare, // ✅ main fare
      Passengers: passengers.map((p, idx) => ({
        ...this.mapPassenger(p),
        Fare: fareQuote.FareBreakdown?.[idx] || fare, // ✅ per passenger fare
      })),
      GSTDetails: {
        GSTCompanyAddress: "",
        GSTCompanyContactNumber: "",
        GSTCompanyName: "",
        GSTNumber: "",
        GSTCompanyEmail: "",
      },
    };

    const response = await this.postLive(
      config.live.endpoints.flightBook,
      payload,
      "live"
    );

    if (response?.Response?.ResponseStatus !== 1) {
      throw new ApiError(
        400,
        response?.Response?.Error?.ErrorMessage || "Booking failed"
      );
    }

    return {
      bookingId: response.FlightItinerary.BookingId,
      pnr: response.FlightItinerary.PNR,
    };
  }

  /* ---------------- TICKET ---------------- */

  async ticketFlight(payload) {
    // 🔹 LCC → DIRECT TICKET
    if (payload.IsLCC === true) {
      return this.postLive(
        config.live.endpoints.flightTicket,
        {
          TraceId: payload.traceId,
          ResultIndex: payload.resultIndex,
          Fare: payload.fareQuote.Fare,
          Passengers: payload.passengers.map((p) => this.mapPassenger(p)),
        },
        "live"
      );
    }

    // 🔹 NON-LCC → BOOKING BASED TICKET
    if (!payload.bookingId || !payload.pnr) {
      throw new ApiError(
        400,
        "bookingId and pnr are required for Non-LCC ticketing"
      );
    }

    return this.postLive(
      config.live.endpoints.flightTicket,
      {
        BookingId: payload.bookingId,
        PNR: payload.pnr,
      },
      "live"
    );
  }

  /* ---------------- PASSENGER MAPPER ---------------- */
  mapPassenger(pax) {
    return {
      Title: pax.title,
      FirstName: pax.firstName,
      LastName: pax.lastName,
      PaxType: pax.paxType, // 1/2/3
      DateOfBirth: pax.dateOfBirth,
      Gender: pax.gender === "Male" ? 1 : 2,

      PassportNo: pax.passportNo || "",
      PassportExpiry: pax.passportExpiry || "",
      PassportIssueDate: pax.passportIssueDate || "",

      AddressLine1: pax.addressLine1 || "NA",
      AddressLine2: pax.addressLine2 || "",
      City: pax.city || "DELHI",
      CountryCode: "356", // INDIA numeric
      CountryName: "India",

      ContactNo: pax.contactNo,
      Email: pax.email,
      IsLeadPax: pax.isLeadPax,
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
        { timeout: config.timeout }
      );
      return data;
    } catch (err) {
      logger.error(
        `TBO ${type} request error`,
        err?.response?.data || err.message
      );
      throw new ApiError(500, `TBO ${type} request failed`);
    }
  }
}

module.exports = new FlightService();
