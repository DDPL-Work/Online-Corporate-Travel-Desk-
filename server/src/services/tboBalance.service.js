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

  if (
    ["production", "prod", "live", "staging", "test", "uat"].includes(envKey)
  ) {
    return "live";
  }

  return "dummy";
};

const getTboEnvConfig = (env = "dummy") => {
  const envKey = normalizeTboEnv(env);
  const config = tboConfig[envKey];

  if (!config) {
    throw new Error(`Missing TBO config for env "${envKey}"`);
  }

  return { envKey, config };
};

const buildSharedUrl = (envKey, endpointKey, config) =>
  typeof tboConfig.resolveUrl === "function"
    ? tboConfig.resolveUrl(envKey, endpointKey)
    : `${config.sharedBase}${config.endpoints[endpointKey]}`;

// ======================================================
// AUTHENTICATE WITH TBO
// ======================================================
// const authenticateTbo = async (env = "dummy") => {
//   const config = tboConfig[env];

//   const url = config.sharedBase + config.endpoints.authenticate;

//   const payload = {
//     ClientId: config.credentials.clientId,
//     UserName: config.credentials.username,
//     Password: config.credentials.password,
//     EndUserIp: config.endUserIp
//   };

//   try {
//     const { data } = await axios.post(url, payload, {
//       timeout: tboConfig.timeout,
//       headers: { "Content-Type": "application/json" }
//     });

//     if (data?.Error?.ErrorCode !== 0) {
//       throw new Error(data?.Error?.ErrorMessage || "TBO Authentication failed");
//     }

//     // Return tokens if returned by TBO, otherwise fallback to .tokens in config
//     return {
//       TokenId: data?.TokenId || config.tokens.tokenId,
//       TokenAgencyId: data?.TokenAgencyId || config.tokens.agencyId,
//       TokenMemberId: data?.TokenMemberId || config.tokens.memberId
//     };
//   } catch (err) {
//     console.error("TBO Auth Error:", err.message);
//     throw new Error("Failed to authenticate with TBO");
//   }
// };

const authenticateTbo = async (env = "dummy") => {
  const { envKey, config } = getTboEnvConfig(env);
  const cached = authCache[envKey];

  if (cached.auth && Date.now() < cached.expiry) {
    return cached.auth;
  }

  const url = buildSharedUrl(envKey, "authenticate", config);

  const payload = {
    ClientId: config.credentials.clientId,
    UserName: config.credentials.username,
    Password: config.credentials.password,
    EndUserIp: config.endUserIp,
  };

  const { data } = await axios.post(url, payload, {
    timeout: tboConfig.timeout,
    headers: { "Content-Type": "application/json" },
  });

  if (
    (data?.Error?.ErrorCode != null && data.Error.ErrorCode !== 0) ||
    (data?.Status != null && data.Status !== 1 && data.Status !== "Success")
  ) {
    throw new Error(data?.Error?.ErrorMessage || "TBO Authentication failed");
  }

  const auth = {
    TokenId: data.TokenId || data.Token || config.tokens.tokenId,
    TokenAgencyId: data.TokenAgencyId || config.tokens.agencyId,
    TokenMemberId: data.TokenMemberId || config.tokens.memberId,
  };

  // Tokens typically last ~15–30 min (adjust if TBO confirms)
  authCache[envKey] = {
    auth,
    expiry: Date.now() + AUTH_TTL_MS,
  };

  return auth;
};

// ======================================================
// GET AGENCY BALANCE
// ======================================================
const getAgencyBalance = async (env = "dummy") => {
  const { envKey, config } = getTboEnvConfig(env);

  // Step 1: Authenticate (or use static tokens)
  const auth = await authenticateTbo(envKey);

  const url = buildSharedUrl(envKey, "getAgencyBalance", config);

  const payload = {
    ClientId: config.credentials.clientId,
    TokenId: auth.TokenId,
    TokenAgencyId: auth.TokenAgencyId,
    TokenMemberId: auth.TokenMemberId,
    EndUserIp: config.endUserIp,
  };

  try {
    const { data } = await axios.post(url, payload, {
      timeout: tboConfig.timeout,
      headers: { "Content-Type": "application/json" },
    });

    if (data?.Error?.ErrorCode != null && data.Error.ErrorCode !== 0) {
      throw new Error(
        data?.Error?.ErrorMessage || "Failed to fetch agency balance"
      );
    }

    // return data;

    return {
      availableBalance: Number(data.CashBalance || 0),
      creditLimit: Number(data.CreditBalance || 0),
      currency: data.PreferredCurrency || "INR",
      raw: data,
    };
  } catch (err) {
    console.error("TBO Agency Balance Error FULL:", {
      env: envKey,
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
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
