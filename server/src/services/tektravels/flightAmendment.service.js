const axios = require("axios");
const config = require("../../config/tbo.config");
const logger = require("../../utils/logger");

class FlightAmendmentService {
  constructor() {
    this.tokens = {}; // ✅ same as hotel
  }

  getEnv() {
    return process.env.NODE_ENV === "production" ? "live" : "dummy";
  }

  isExpired(tokenObj) {
    if (!tokenObj) return true;
    return Date.now() > tokenObj.expiry;
  }

  /* ================= AUTH ================= */
  async authenticate(env) {
    const cfg = config[env];

    try {
      const payload = {
        ClientId: cfg.credentials.clientId,
        UserName: cfg.credentials.username,
        Password: cfg.credentials.password,
        EndUserIp: cfg.endUserIp,
      };

      const url = `${cfg.sharedBase}${cfg.endpoints.authenticate}`;

      const { data } = await axios.post(url, payload, {
        timeout: config.timeout,
      });

      const token = data?.TokenId || data?.Response?.TokenId;

      const status = data?.Status ?? data?.Response?.ResponseStatus;

      if (!token || status !== 1) {
        throw new Error(
          data?.Error?.ErrorMessage ||
            data?.Response?.Error?.ErrorMessage ||
            "Auth failed",
        );
      }
      this.tokens[env] = {
        value: token,
        expiry: Date.now() + 24 * 60 * 60 * 1000,
      };

      return this.tokens[env].value;
    } catch (err) {
      logger.error("FLIGHT AUTH ERROR", {
        env,
        error: err?.response?.data || err.message,
      });
      throw err;
    }
  }

  async getToken(env) {
    if (this.isExpired(this.tokens[env])) {
      await this.authenticate(env);
    }
    return this.tokens[env].value;
  }

  /* ================= EXECUTOR ================= */
  async execute(endpoint, payload) {
    const env = this.getEnv();
    const start = Date.now();

    try {
      const token = await this.getToken(env);

      const finalPayload = {
        EndUserIp: config[env].endUserIp,
        TokenId: token,
        ...payload,
      };

      logger.info("TBO FLIGHT REQUEST", {
        env,
        endpoint,
        payload: finalPayload,
      });

     const cfg = config[env];

// 🔥 ALWAYS USE AIR BASE FOR FLIGHT APIs
const url = `${cfg.base}${cfg.endpoints[endpoint]}`;

console.log("FINAL URL:", url);

const response = await axios.post(
  url,
  finalPayload,
  { timeout: config.timeout },
);

      logger.info("TBO FLIGHT RESPONSE", {
        endpoint,
        durationMs: Date.now() - start,
        responseStatus: response?.data?.Response?.ResponseStatus,
        fullResponse: response.data,
      });

      return response.data;
    } catch (err) {
      const errorCode = err?.response?.data?.Response?.Error?.ErrorCode;

      /* 🔥 TOKEN EXPIRED HANDLING */
      if (errorCode === 4) {
        logger.warn("FLIGHT TOKEN EXPIRED → REFRESHING");

        const env = this.getEnv();

        this.tokens[env] = null;

        const newToken = await this.getToken(env);

        payload.TokenId = newToken;

        return this.execute(endpoint, payload);
      }

      logger.error("TBO FLIGHT ERROR", {
        error: err.message,
        response: err?.response?.data,
      });

      throw err;
    }
  }

  /* ================= APIs ================= */

  async sendChangeRequest(payload) {
    return this.execute("flightSendChangeRequest", payload);
  }

  async getChangeRequestStatus(payload) {
    return this.execute("flightGetChangeRequestStatus", payload);
  }

  async getCancellationCharges(bookingId) {
    return this.execute("flightCancellationCharges", {
      BookingId: bookingId,
      RequestType: 1,
      BookingMode: 5,
    });
  }

  async releasePnr(payload) {
    return this.execute("flightReleasePNR", payload);
  }
}

module.exports = new FlightAmendmentService();
