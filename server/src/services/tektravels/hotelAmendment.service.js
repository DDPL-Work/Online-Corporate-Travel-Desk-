const axios = require("axios");
const config = require("../../config/tbo.hotel.config");
const logger = require("../../utils/logger");
const ApiError = require("../../utils/ApiError");

class HotelAmendmentService {
  constructor() {
    this.tokens = {}; // ✅ REQUIRED
  }

  isExpired(tokenObj) {
    if (!tokenObj) return true;
    return Date.now() > tokenObj.expiry;
  }
  getEnv() {
    return process.env.NODE_ENV === "production" ? "live" : "dummy";
  }

  async authenticate(type) {
    const cfg = config[type];

    if (!cfg) {
      throw new Error(`TBO config not found for env: ${type}`);
    }

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
      logger.error("TBO auth error", {
        type,
        error: err?.response?.data || err.message,
      });
      throw new ApiError(500, `TBO ${type} authentication failed`);
    }
  }

  async getToken(type) {
    if (this.isExpired(this.tokens[type])) {
      await this.authenticate(type);
    }
    return this.tokens[type].value;
  }

  /* ---------------- INTERNAL EXECUTOR ---------------- */
  async execute(endpoint, payload) {
    const env = this.getEnv();
    const start = Date.now();

    try {
      logger.info("TBO HOTEL AMENDMENT REQUEST", {
        env,
        endpoint,
        payload,
      });

      const url = `${config[env].base}${config[env].endpoints[endpoint]}`;

      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: config.timeout,
      });

      const duration = Date.now() - start;

      logger.info("TBO HOTEL AMENDMENT RESPONSE", {
        env,
        endpoint,
        durationMs: duration,
        responseStatus:
          response?.data?.Status ||
          response?.data?.ResponseStatus ||
          response?.data?.HotelChangeRequestResult?.ResponseStatus,
        errorCode:
          response?.data?.Error?.ErrorCode ||
          response?.data?.Response?.Error?.ErrorCode ||
          response?.data?.HotelChangeRequestResult?.Error?.ErrorCode,
        errorMessage:
          response?.data?.Error?.ErrorMessage ||
          response?.data?.Response?.Error?.ErrorMessage ||
          response?.data?.HotelChangeRequestResult?.Error?.ErrorMessage,
        fullResponse: response.data,
      });

      return response.data;
    } catch (err) {
      const duration = Date.now() - start;

      logger.error("TBO HOTEL AMENDMENT FAILURE", {
        env,
        endpoint,
        durationMs: duration,
        errorMessage: err.message,
        response: err?.response?.data,
        stack: err.stack,
      });

      // 🔁 HANDLE TOKEN EXPIRY (ErrorCode: 4)
      const errorCode =
        err?.response?.data?.Error?.ErrorCode ||
        err?.response?.data?.HotelChangeRequestResult?.Error?.ErrorCode;

      if (errorCode === 4) {
        logger.warn("TBO token expired. Refreshing...");

        const env = this.getEnv();

        // invalidate old token
        this.tokens[env] = null;

        // get new token
        const newToken = await this.getToken(env);

        // retry with new token
        payload.TokenId = newToken;

        return this.execute(endpoint, payload);
      }

      // ❌ normal error flow
      const errMsg =
        err?.response?.data?.Error?.ErrorMessage ||
        err?.response?.data?.Response?.Error?.ErrorMessage ||
        err?.response?.data?.HotelChangeRequestResult?.Error?.ErrorMessage ||
        err.message;

      throw new Error(errMsg || "Hotel amendment API failed");
    }
  }

  /* ---------------- SEND CHANGE REQUEST ---------------- */
  async sendChangeRequest(payload) {
    const env = this.getEnv();
    const token = await this.getToken(env); // 🔥 ADD THIS

    return this.execute("sendChangeRequest", {
      EndUserIp: config[env].endUserIp,
      TokenId: token, // 🔥 USE DYNAMIC TOKEN
      BookingId: payload.BookingId,
      RequestType: payload.RequestType || 4,
      Remarks: payload.Remarks,
    });
  }

  /* ---------------- GET CHANGE REQUEST STATUS ---------------- */
  async getChangeRequestStatus(payload) {
    const env = this.getEnv();
    const token = await this.getToken(env); // 🔥 ADD THIS

    return this.execute("getChangeRequestStatus", {
      EndUserIp: config[env].endUserIp,
      TokenId: token, // 🔥 USE DYNAMIC TOKEN
      ChangeRequestId: payload.ChangeRequestId,
    });
  }
}

module.exports = new HotelAmendmentService();
