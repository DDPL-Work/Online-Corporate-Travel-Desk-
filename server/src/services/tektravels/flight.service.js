const axios = require("axios");
const config = require("../../config/tbo.config");
const logger = require("../../utils/logger");
const ApiError = require("../../utils/ApiError");

/* ---------------- DATE FORMAT ---------------- */
const toTboDate = (value) => {
  if (!value) throw new ApiError(400, `Invalid date value: ${value}`);

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)
  ) return value;

  if (typeof value === "string" && !isNaN(Date.parse(value))) {
    return new Date(value).toISOString().slice(0, 19);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 19);
  }

  throw new ApiError(400, `Invalid TBO date format: ${value}`);
};

class FlightService {
  constructor() {
    this.tokens = {
      dummy: { value: null, expiry: 0 },
      live: { value: null, expiry: 0 },
    };
  }

  getEnv() {
    return process.env.NODE_ENV === "production" ? "live" : "dummy";
  }

  isExpired(token) {
    return !token.value || Date.now() >= token.expiry;
  }

  /* ---------------- AUTH ---------------- */
  async authenticate(type) {
    const cfg = config[type];

    try {
      const { data } = await axios.post(
        `${cfg.authBase}${cfg.endpoints.authenticate}`, // ✅ FIXED
        {
          ClientId: cfg.credentials.clientId,
          UserName: cfg.credentials.username,
          Password: cfg.credentials.password,
          EndUserIp: cfg.endUserIp,
        },
        { timeout: config.timeout }
      );

      if (data?.Status !== 1) {
        throw new Error(data?.Error?.ErrorMessage || "Auth failed");
      }

      this.tokens[type] = {
        value: data.TokenId,
        expiry: Date.now() + 23 * 60 * 60 * 1000,
      };

      return data.TokenId;
    } catch (err) {
      logger.error("TBO AUTH ERROR", err.response?.data || err.message);
      throw new ApiError(500, "TBO authentication failed");
    }
  }

  async getToken(type) {
    if (this.isExpired(this.tokens[type])) {
      await this.authenticate(type);
    }
    return this.tokens[type].value;
  }

  /* ---------------- COMMON HEADERS ---------------- */
  getHeaders(cfg, token) {
    const base64Auth = Buffer.from(
      `${cfg.credentials.username}:${cfg.credentials.password}`
    ).toString("base64");

    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${base64Auth}`,
      TokenId: token,
      ClientId: cfg.credentials.clientId,
    };
  }

  /* ---------------- SEARCH ---------------- */
  async searchFlights(params) {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);

    const cabinMap = {
      all: 1,
      economy: 2,
      "premium economy": 3,
      business: 4,
      "premium business": 5,
      first: 6,
    };

    const resolveCabinClass = (value) => {
      if (typeof value === "number" && value >= 1 && value <= 6) return value;
      if (typeof value === "string") {
        const key = value.trim().toLowerCase();
        if (cabinMap[key]) return cabinMap[key];
      }
      return 2;
    };

    let segments = [];

    if (Number(params.journeyType) === 1) {
      segments.push({
        Origin: params.origin,
        Destination: params.destination,
        PreferredDepartureTime: toTboDate(params.departureDate),
        FlightCabinClass: resolveCabinClass(params.cabinClass),
      });
    }

    if (Number(params.journeyType) === 2) {
      segments.push(
        {
          Origin: params.origin,
          Destination: params.destination,
          PreferredDepartureTime: toTboDate(params.departureDate),
          FlightCabinClass: resolveCabinClass(params.cabinClass),
        },
        {
          Origin: params.destination,
          Destination: params.origin,
          PreferredDepartureTime: toTboDate(params.returnDate),
          FlightCabinClass: resolveCabinClass(params.cabinClass),
        }
      );
    }

    const payload = {
      EndUserIp: cfg.endUserIp,
      TokenId: token,
      AdultCount: Number(params.adults ?? 1),
      ChildCount: Number(params.children ?? 0),
      InfantCount: Number(params.infants ?? 0),
      JourneyType: Number(params.journeyType),
      Segments: segments,
      DirectFlight: false,
      OneStopFlight: false,
      Sources: null,
    };

    const { data } = await axios.post(
      `${cfg.base}${cfg.endpoints.flightSearch}`,
      payload,
      {
        timeout: config.timeout,
        headers: this.getHeaders(cfg, token), // ✅ FIXED
      }
    );

    return data;
  }

  /* ---------------- COMMON POST ---------------- */
  async postLive(endpoint, payload, type = "live") {
    const cfg = config[type];
    const token = await this.getToken(type);

    try {
      const { data } = await axios.post(
        `${cfg.base}${endpoint}`,
        {
          EndUserIp: cfg.endUserIp,
          TokenId: token,
          ...payload,
        },
        {
          timeout: config.timeout,
          headers: this.getHeaders(cfg, token), // ✅ FIXED
        }
      );

      return data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.Error?.ErrorMessage ||
        err.response?.data?.Response?.Error?.ErrorMessage;

      // 🔥 AUTO RETRY ON TOKEN EXPIRE
      if (errorMsg?.includes("Invalid Token")) {
        this.tokens[type] = { value: null, expiry: 0 };

        const newToken = await this.getToken(type);

        const { data } = await axios.post(
          `${cfg.base}${endpoint}`,
          {
            EndUserIp: cfg.endUserIp,
            TokenId: newToken,
            ...payload,
          },
          {
            headers: this.getHeaders(cfg, newToken),
          }
        );

        return data;
      }

      logger.error("TBO ERROR", err.response?.data || err.message);

      throw new ApiError(
        500,
        errorMsg || "TBO request failed"
      );
    }
  }

  /* ---------------- FARE QUOTE ---------------- */
  async getFareQuote(traceId, resultIndex) {
    return this.postLive(config.live.endpoints.flightFareQuote, {
      TraceId: traceId,
      ResultIndex: resultIndex,
    });
  }

  /* ---------------- SSR ---------------- */
  async getSSR(traceId, resultIndex) {
    return this.postLive(config.live.endpoints.flightSSR, {
      TraceId: traceId,
      ResultIndex: resultIndex,
    });
  }

  /* ---------------- BOOK ---------------- */
  async bookFlight(payload) {
    return this.postLive(config.live.endpoints.flightBook, payload);
  }

  /* ---------------- TICKET ---------------- */
  async ticketFlight(payload) {
    return this.postLive(config.live.endpoints.flightTicket, payload);
  }
}

module.exports = new FlightService();
