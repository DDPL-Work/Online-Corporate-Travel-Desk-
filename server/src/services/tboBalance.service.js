// server/src/services/tboBalance.service.js

const axios = require("axios");
const tboConfig = require("../config/tbo.config");

const AUTH_TTL_MS = 20 * 60 * 1000;

const authCache = {
  dummy: { auth: null, expiry: 0 },
  live: { auth: null, expiry: 0 },
};

const normalizeTboEnv = (env = process.env.TBO_ENV || process.env.NODE_ENV) => {
  const envKey = String(env || "")
    .trim()
    .toLowerCase();

  return ["production", "prod", "live", "staging", "test", "uat"].includes(envKey)
    ? "live"
    : "dummy";
};

const getTboEnvConfig = (env = "dummy") => {
  const envKey = normalizeTboEnv(env);
  const config = tboConfig[envKey];

  if (!config) {
    throw new Error(`Missing TBO config for env "${envKey}"`);
  }

  return { envKey, config };
};

// ======================================================
// AUTHENTICATE WITH TBO
// ======================================================
const authenticateTbo = async (env = "dummy") => {
  const { envKey, config } = getTboEnvConfig(env);
  const cached = authCache[envKey];

  if (cached.auth && Date.now() < cached.expiry) {
    return cached.auth;
  }

  // Use URL resolution directly from tbo.config
  const url = tboConfig.resolveUrl(envKey, "authenticate");

  const payload = {
    ClientId: config.credentials.clientId,
    UserName: config.credentials.username,
    Password: config.credentials.password,
    EndUserIp: config.endUserIp,
  };

  try {
    const { data } = await axios.post(url, payload, {
      timeout: tboConfig.timeout || 500000,
      headers: { "Content-Type": "application/json" },
    });

    if (
      (data?.Error?.ErrorCode != null && data.Error.ErrorCode !== 0) ||
      (data?.Status != null && data.Status !== 1 && data.Status !== "Success")
    ) {
      throw new Error(data?.Error?.ErrorMessage || "TBO Authentication API reported failure");
    }

    const auth = {
      TokenId: data?.TokenId || data?.Token || config.tokens.tokenId,
      TokenAgencyId: data?.Member?.AgencyId || data?.TokenAgencyId || config.tokens.agencyId,
      TokenMemberId: data?.Member?.MemberId || data?.TokenMemberId || config.tokens.memberId,
    };

    authCache[envKey] = {
      auth,
      expiry: Date.now() + AUTH_TTL_MS,
    };

    return auth;
  } catch (err) {
    console.error("TBO Auth Error:", {
      env: envKey,
      endpoint: "authenticate",
      message: err.message,
      status: err.response?.status,
      response: err.response?.data,
    });
    
    throw new Error(
      err.response?.data?.Error?.ErrorMessage ||
      err.message || 
      "Failed to authenticate with TBO"
    );
  }
};

// ======================================================
// GET AGENCY BALANCE
// ======================================================
const getAgencyBalance = async (env = "dummy") => {
  const { envKey, config } = getTboEnvConfig(env);

  const auth = await authenticateTbo(envKey);

  const url = tboConfig.resolveUrl(envKey, "getAgencyBalance");

  const payload = {
    ClientId: config.credentials.clientId,
    TokenId: auth.TokenId,
    TokenAgencyId: auth.TokenAgencyId,
    TokenMemberId: auth.TokenMemberId,
    EndUserIp: config.endUserIp,
  };

  try {
    const { data } = await axios.post(url, payload, {
      timeout: tboConfig.timeout || 500000,
      headers: { "Content-Type": "application/json" },
    });

    if (
      (data?.Error?.ErrorCode != null && data.Error.ErrorCode !== 0) ||
      (data?.Status != null && data.Status !== 1 && data.Status !== "Success")
    ) {
      throw new Error(data?.Error?.ErrorMessage || "TBO Agency Balance API reported failure");
    }

    return {
      availableBalance: Number(data.CashBalance || 0),
      creditLimit: Number(data.CreditBalance || 0),
      currency: data.PreferredCurrency || "INR",
      raw: data,
    };
  } catch (err) {
    console.error("TBO Agency Balance Error:", {
      env: envKey,
      endpoint: "getAgencyBalance",
      message: err.message,
      status: err.response?.status,
      response: err.response?.data,
    });

    throw new Error(
      err.response?.data?.Error?.ErrorMessage ||
      err.message || 
      "Failed to fetch agency balance"
    );
  }
};

module.exports = {
  getAgencyBalance,
};
