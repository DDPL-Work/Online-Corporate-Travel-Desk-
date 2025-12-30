// server/src/services/tbo.service.js

const axios = require("axios");
const tboConfig = require("../config/tbo.config");

// ======================================================
// AUTHENTICATE WITH TBO
// ======================================================
const authenticateTbo = async (env = "dummy") => {
  const config = tboConfig[env];

  const url = config.sharedBase + config.endpoints.authenticate;

  const payload = {
    ClientId: config.credentials.clientId,
    UserName: config.credentials.username,
    Password: config.credentials.password,
    EndUserIp: config.endUserIp
  };

  try {
    const { data } = await axios.post(url, payload, {
      timeout: tboConfig.timeout,
      headers: { "Content-Type": "application/json" }
    });

    if (data?.Error?.ErrorCode !== 0) {
      throw new Error(data?.Error?.ErrorMessage || "TBO Authentication failed");
    }

    // Return tokens if returned by TBO, otherwise fallback to .tokens in config
    return {
      TokenId: data?.TokenId || config.tokens.tokenId,
      TokenAgencyId: data?.TokenAgencyId || config.tokens.agencyId,
      TokenMemberId: data?.TokenMemberId || config.tokens.memberId
    };
  } catch (err) {
    console.error("TBO Auth Error:", err.message);
    throw new Error("Failed to authenticate with TBO");
  }
};

// ======================================================
// GET AGENCY BALANCE
// ======================================================
const getAgencyBalance = async (env = "dummy") => {
  const config = tboConfig[env];

  // Step 1: Authenticate (or use static tokens)
  const auth = await authenticateTbo(env);

  const url = config.sharedBase + config.endpoints.getAgencyBalance;

  const payload = {
    ClientId: config.credentials.clientId,
    TokenId: auth.TokenId,
    TokenAgencyId: auth.TokenAgencyId,
    TokenMemberId: auth.TokenMemberId,
    EndUserIp: config.endUserIp
  };

  try {
    const { data } = await axios.post(url, payload, {
      timeout: tboConfig.timeout,
      headers: { "Content-Type": "application/json" }
    });

    if (data?.Error?.ErrorCode !== 0) {
      throw new Error(data?.Error?.ErrorMessage || "Failed to fetch agency balance");
    }

    return data;
  } catch (err) {
    console.error("TBO Agency Balance Error:", err.message);
    throw new Error("Failed to fetch agency balance");
  }
};

module.exports = {
  getAgencyBalance
};