const axios = require("axios");
const config = require("../../config/tbo.config");
const ApiError = require("../../utils/ApiError");

class TBOAuth {
  constructor() {
    this.token = { value: null, expiry: 0 };
  }

  isExpired() {
    return !this.token.value || Date.now() >= this.token.expiry;
  }

  async authenticate() {
    const cfg = config.live;

    const payload = {
      ClientId: cfg.credentials.clientId,
      UserName: cfg.credentials.username,
      Password: cfg.credentials.password,
      EndUserIp: cfg.endUserIp,
    };

    const { data } = await axios.post(
      `${cfg.sharedBase}${cfg.endpoints.authenticate}`,
      payload
    );

    if (data?.Status !== 1 && data?.Status !== "Success") {
      throw new ApiError(
        500,
        data?.Error?.ErrorMessage || "TBO authentication failed"
      );
    }

    this.token = {
      value: data.TokenId || data.Token,
      expiry: Date.now() + 24 * 60 * 60 * 1000,
    };

    return this.token.value;
  }

  async getToken() {
    if (this.isExpired()) {
      await this.authenticate();
    }
    return this.token.value;
  }
}

module.exports = new TBOAuth();
