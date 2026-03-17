const flightService = require("./flight.service");
const config = require("../../config/tbo.config");
const logger = require("../../utils/logger");

class FlightAmendmentService {
  getEnv() {
    return process.env.NODE_ENV === "production" ? "live" : "dummy";
  }

  /* ---------------- INTERNAL LOG WRAPPER ---------------- */
  async execute(endpoint, payload) {
    const env = this.getEnv();
    const start = Date.now();

    try {
      logger.info("TBO AMENDMENT REQUEST", {
        env,
        endpoint,
        payload,
      });

      const response = await flightService.postLive(
        config[env].endpoints[endpoint],
        payload,
        env
      );

      const duration = Date.now() - start;

      logger.info("TBO AMENDMENT RESPONSE", {
        env,
        endpoint,
        durationMs: duration,
        responseStatus: response?.Response?.ResponseStatus,
        errorCode: response?.Response?.Error?.ErrorCode,
        errorMessage: response?.Response?.Error?.ErrorMessage,
        fullResponse: response,
      });

      return response;

    } catch (err) {
      const duration = Date.now() - start;

      logger.error("TBO AMENDMENT FAILURE", {
        env,
        endpoint,
        durationMs: duration,
        errorMessage: err.message,
        stack: err.stack,
      });

      throw err;
    }
  }

  /* ---------------- RELEASE PNR ---------------- */
  async releasePnr(payload) {
    return this.execute("flightReleasePNR", payload);
  }

  /* ---------------- SEND CHANGE REQUEST ---------------- */
  async sendChangeRequest(payload) {
    return this.execute("flightSendChangeRequest", payload);
  }

  /* ---------------- GET CHANGE REQUEST STATUS ---------------- */
  async getChangeRequestStatus(payload) {
    return this.execute("flightGetChangeRequestStatus", payload);
  }

  /* ---------------- GET CANCELLATION CHARGES ---------------- */
  async getCancellationCharges(bookingId) {
    return this.execute("flightCancellationCharges", {
      BookingId: bookingId,
      RequestType: 1,
      BookingMode: 5
    });
  }
}

module.exports = new FlightAmendmentService();