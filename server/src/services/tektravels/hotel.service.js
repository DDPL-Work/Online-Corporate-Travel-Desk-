const axios = require("axios");
const config = require("../../config/tbo.hotel.config");
const logger = require("../../utils/logger");
const ApiError = require("../../utils/ApiError");

const RETRYABLE_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EPIPE",
  "ETIMEDOUT",
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toYmd(dateLike) {
  if (!dateLike) return dateLike;
  if (typeof dateLike === "string") {
    // Already looks like YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateLike)) return dateLike;
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return dateLike;
    return d.toISOString().slice(0, 10);
  }
  if (dateLike instanceof Date) return dateLike.toISOString().slice(0, 10);
  return dateLike;
}

function extractProviderError(err) {
  const data = err?.response?.data;
  const status = err?.response?.status;

  const message =
    data?.Error?.ErrorMessage ||
    data?.Error?.Message ||
    data?.Message ||
    data?.message ||
    err?.message ||
    "Unknown error";

  return {
    status,
    message: String(message),
    data,
    code: err?.code,
  };
}

function isRetryable(err) {
  const status = err?.response?.status;
  if (status === 408 || status === 429) return true;
  if (typeof status === "number" && status >= 500) return true;

  if (err?.code && RETRYABLE_ERROR_CODES.has(err.code)) return true;
  // Axios timeouts often come through as ECONNABORTED with a message.
  if (typeof err?.message === "string" && /timeout/i.test(err.message)) {
    return true;
  }

  return false;
}

function throwIfTboBodyError(data, context) {
  const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

  const pickErrorMessage = (obj) => {
    const msg = obj?.Error?.ErrorMessage || obj?.Error?.Message;
    if (isNonEmptyString(msg)) return msg.trim();
    return null;
  };

  const isExplicitFailure = (obj) => {
    if (typeof obj?.ResponseStatus === "number") return obj.ResponseStatus !== 1;

    if (typeof obj?.Status?.Code === "number") {
      return obj.Status.Code !== 200 && obj.Status.Code !== 1;
    }

    if (typeof obj?.Status === "number") return obj.Status !== 1 && obj.Status !== 200;

    if (typeof obj?.Status === "string") return !/success/i.test(obj.Status);

    return false; // unknown -> don't fail fast based on descriptions alone
  };

  const pickStatusDescription = (obj) => {
    const desc =
      obj?.Status?.Description ||
      obj?.Status?.ErrorMessage ||
      obj?.Status?.Message ||
      obj?.Message;

    if (!isNonEmptyString(desc)) return null;

    // Do not treat success descriptions as errors.
    if (/successful|success/i.test(desc)) return null;

    return desc.trim();
  };

  const check = (obj) => {
    if (!obj) return;

    const errMsg = pickErrorMessage(obj);
    if (errMsg) {
      throw new ApiError(502, `TBO ${context} failed: ${errMsg}`);
    }

    if (isExplicitFailure(obj)) {
      const desc = pickStatusDescription(obj);
      throw new ApiError(
        502,
        `TBO ${context} failed: ${desc || "Bad status from supplier"}`,
      );
    }
  };

  // Root-level body can carry flags or error wrapper
  check(data);

  // Many hotel endpoints wrap the real result under these keys.
  check(data?.BookResult);
  check(data?.PreBookResult);
  check(data?.GetHotelRoomResult);
  check(data?.GetHotelDetailsResult);
  check(data?.HotelSearchResult);
}

function isTokenSessionExpiredMessage(message) {
  const msg = String(message || "");
  // If message explicitly references TraceId, it's not the TokenId session we can refresh here.
  if (/trace\s*id/i.test(msg)) return false;
  return /session\s*expired|token\s*expired|invalid\s*token/i.test(msg);
}

function normalizeTraceHotelIndex(payload = {}) {
  const TraceId = payload.TraceId || payload.traceId || payload.traceID;
  const HotelCode = payload.HotelCode || payload.hotelCode || payload.hotelcode;
  const ResultIndex =
    payload.ResultIndex ||
    payload.resultIndex ||
    payload.roomIndex ||
    payload.roomindex;

  return {
    TraceId,
    HotelCode,
    ResultIndex: ResultIndex !== undefined ? String(ResultIndex) : ResultIndex,
  };
}

async function withRetries(fn, { label, retries = 2, baseDelayMs = 300 } = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= retries || !isRetryable(err)) throw err;

      const delay = baseDelayMs * Math.pow(2, attempt);
      logger.warn("TBO RETRY", {
        label,
        attempt: attempt + 1,
        retries,
        delayMs: delay,
        code: err?.code,
        status: err?.response?.status,
        message: err?.message,
      });
      await sleep(delay);
    }
  }

  throw lastErr;
}

class HotelService {
  constructor() {
    this.tokens = {
      dummy: { value: null, expiry: 0 },
      live: { value: null, expiry: 0 },
    };
  }

  /* =====================================================
     ENV
  ====================================================== */
  getEnv() {
    const forced = (process.env.TBO_HOTEL_ENV || "").trim().toLowerCase();
    if (forced === "live" || forced === "dummy") return forced;
    return process.env.NODE_ENV === "production" ? "live" : "dummy";
  }

  /* =====================================================
     TOKEN HANDLING
  ====================================================== */
  isExpired(token) {
    return !token.value || Date.now() >= token.expiry;
  }

  async authenticate(type) {
    const cfg = config[type];

    try {
      if (!cfg?.credentials?.clientId) {
        throw new ApiError(500, "TBO ClientId missing (check env config)");
      }
      if (!cfg?.credentials?.username || !cfg?.credentials?.password) {
        throw new ApiError(
          500,
          "TBO username/password missing (check env config)",
        );
      }
      if (!cfg?.endUserIp && !process.env.TBO_END_USER_IP) {
        throw new ApiError(500, "TBO_END_USER_IP is missing");
      }

      const { data } = await withRetries(
        () =>
          axios.post(
            `${cfg.sharedBase}${cfg.endpoints.authenticate}`,
            {
              ClientId: cfg.credentials.clientId,
              UserName: cfg.credentials.username,
              Password: cfg.credentials.password,
              EndUserIp: cfg.endUserIp || process.env.TBO_END_USER_IP,
            },
            { timeout: config.timeout },
          ),
        { label: "authenticate" },
      );

      if (data?.Status !== 1 && data?.Status !== "Success") {
        throw new Error(data?.Error?.ErrorMessage || "Auth failed");
      }

      this.tokens[type] = {
        value: data.TokenId || data.Token,
        // In practice these tokens are short-lived (often ~15-30 minutes).
        // Keep TTL conservative to avoid using stale tokens in production.
        expiry: Date.now() + 20 * 60 * 1000,
      };

      return this.tokens[type].value;
    } catch (err) {
      const ex = extractProviderError(err);
      logger.error("TBO AUTH ERROR", {
        env: type,
        status: ex.status,
        code: ex.code,
        message: ex.message,
        data: ex.data,
      });
      throw new ApiError(500, `TBO authentication failed: ${ex.message}`);
    }
  }

  async getToken(type) {
    if (this.isExpired(this.tokens[type])) {
      await this.authenticate(type);
    }
    return this.tokens[type].value;
  }

  /* =====================================================
     STATIC API HELPER (Static Credentials)
  ====================================================== */
  async staticGet(endpoint, query = "") {
    const env = this.getEnv();
    const cfg = config[env];

    try {
      const { data } = await withRetries(
        () =>
          axios.get(`${cfg.staticBase}${endpoint}${query}`, {
            auth: {
              username: cfg.credentials.tboUSerName,
              password: cfg.credentials.tboPassword,
            },
            timeout: config.timeout,
          }),
        { label: "staticGet" },
      );

      throwIfTboBodyError(data, "static API");
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const ex = extractProviderError(err);
      logger.error("TBO STATIC ERROR", {
        env,
        endpoint,
        status: ex.status,
        code: ex.code,
        message: ex.message,
        data: ex.data,
      });
      throw new ApiError(500, `TBO static API failed: ${ex.message}`);
    }
  }

  /* =====================================================
     AFFILIATE API HELPER (Search / PreBook)
     Basic Auth + Token
  ====================================================== */
  async affiliatePost(endpoint, payload, _attempt = 0) {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);

    try {
      const basicUser = String(cfg?.credentials?.username || "").trim();
      const basicPass = String(cfg?.credentials?.password || "").trim();

      if (!basicUser || !basicPass) {
        throw new ApiError(
          500,
          "TBO affiliate credentials missing (username/password)",
        );
      }
      if (!token) {
        throw new ApiError(500, "TBO TokenId missing (authentication failed)");
      }

      const endUserIp =
        payload?.EndUserIp ||
        payload?.endUserIp ||
        cfg.endUserIp ||
        process.env.TBO_END_USER_IP;

      if (!endUserIp) {
        throw new ApiError(500, "TBO_END_USER_IP is missing");
      }

      // Ensure our required fields don't get overwritten by undefined values from payload.
      const clean = { ...(payload || {}) };
      delete clean.EndUserIp;
      delete clean.endUserIp;
      delete clean.TokenId;
      delete clean.tokenId;

      const authHeader = Buffer.from(`${basicUser}:${basicPass}`).toString(
        "base64",
      );

      const { data } = await withRetries(
        () =>
          axios.post(
            `${cfg.base1}${endpoint}`,
            {
              ...clean,
              EndUserIp: endUserIp,
              TokenId: token,
            },
            {
              auth: {
                username: basicUser,
                password: basicPass,
              },
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                // Ensure Authorization is never "empty" even if axios auth is bypassed.
                Authorization: `Basic ${authHeader}`,
                // Some TBO stacks expect these values in headers (despite being present in body).
                TokenId: token,
                EndUserIp: endUserIp,
              },
              timeout: config.timeout,
            },
          ),
        { label: `affiliatePost:${endpoint}` },
      );

      try {
        throwIfTboBodyError(data, `affiliate ${endpoint}`);
      } catch (err) {
        // TBO sometimes expires TokenId earlier than our conservative TTL. Refresh and retry once.
        if (
          _attempt === 0 &&
          err instanceof ApiError &&
          isTokenSessionExpiredMessage(err.message)
        ) {
          logger.warn("TBO TOKEN SESSION EXPIRED (AFFILIATE) -> REAUTH", {
            env,
            endpoint,
          });
          this.tokens[env] = { value: null, expiry: 0 };
          await this.authenticate(env);
          return this.affiliatePost(endpoint, payload, _attempt + 1);
        }
        throw err;
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const ex = extractProviderError(err);
      logger.error("TBO AFFILIATE ERROR", {
        env,
        endpoint,
        status: ex.status,
        code: ex.code,
        message: ex.message,
        data: ex.data,
      });
      throw new ApiError(500, `TBO affiliate API failed: ${ex.message}`);
    }
  }

  /* =====================================================
     TOKEN BASED POST (base / base2 selectable)
  ====================================================== */
  async tokenPost(endpoint, payload, baseType = "base", _attempt = 0) {
    const env = this.getEnv();
    const cfg = config[env];
    const token = await this.getToken(env);

    try {
      if (!token) {
        throw new ApiError(500, "TBO TokenId missing (authentication failed)");
      }

      const basicUser = String(cfg?.credentials?.username || "").trim();
      const basicPass = String(cfg?.credentials?.password || "").trim();
      if (!basicUser || !basicPass) {
        throw new ApiError(500, "TBO credentials missing (username/password)");
      }

      const endUserIp =
        payload?.EndUserIp ||
        payload?.endUserIp ||
        cfg.endUserIp ||
        process.env.TBO_END_USER_IP;

      if (!endUserIp) {
        throw new ApiError(500, "TBO_END_USER_IP is missing");
      }

      const clean = { ...(payload || {}) };
      delete clean.EndUserIp;
      delete clean.endUserIp;
      delete clean.TokenId;
      delete clean.tokenId;

      // Some TBO endpoints accept/require basic auth headers in addition to TokenId.
      const authHeader = Buffer.from(`${basicUser}:${basicPass}`).toString(
        "base64",
      );

      const isHotelSvcEndpoint =
        typeof endpoint === "string" &&
        (endpoint.includes("hotelservice.svc") ||
          endpoint.includes("internalhotelservice.svc"));

      // TBO WCF endpoints commonly redirect (307) to a trailing-slash URL.
      // Redirects can drop auth headers, so we normalize upfront.
      const normalizedEndpoint =
        isHotelSvcEndpoint && typeof endpoint === "string" && !endpoint.endsWith("/")
          ? `${endpoint}/`
          : endpoint;

      // WCF hotelservice endpoints often expect these identity fields.
      const identity = isHotelSvcEndpoint
        ? {
            ...(cfg?.credentials?.clientId
              ? { ClientId: cfg.credentials.clientId }
              : {}),
            ...(cfg?.tokens?.agencyId ? { TokenAgencyId: cfg.tokens.agencyId } : {}),
            ...(cfg?.tokens?.memberId ? { TokenMemberId: cfg.tokens.memberId } : {}),
          }
        : {};

      if (isHotelSvcEndpoint) {
        if (!identity.ClientId) {
          throw new ApiError(500, "TBO ClientId missing for hotel booking");
        }
        if (!identity.TokenAgencyId || !identity.TokenMemberId) {
          throw new ApiError(
            500,
            "TBO TokenAgencyId/TokenMemberId missing for hotel booking",
          );
        }
      }

      const axiosConfig = {
        timeout: config.timeout,
        maxRedirects: 0,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          // Ensure Authorization is present (supplier error otherwise: "Empty Header in request").
          Authorization: `Basic ${authHeader}`,
          // Some TBO stacks expect these values in headers (despite being present in body).
          TokenId: token,
          EndUserIp: endUserIp,
          ...(isHotelSvcEndpoint ? identity : {}),
        },
      };

      axiosConfig.auth = { username: basicUser, password: basicPass };

      const url = `${cfg[baseType]}${normalizedEndpoint}`;

      const doPost = (authUser, authPass) => {
        const h = Buffer.from(`${authUser}:${authPass}`).toString("base64");
        const cfg2 = {
          ...axiosConfig,
          auth: { username: authUser, password: authPass },
          headers: {
            ...axiosConfig.headers,
            Authorization: `Basic ${h}`,
          },
        };

        return axios.post(
          url,
          {
            ...identity,
            ...clean,
            EndUserIp: endUserIp,
            TokenId: token,
          },
          cfg2,
        );
      };

      // Primary attempt with standard creds; for hotelservice endpoints, retry once with static creds if provided.
      const { data } = await withRetries(
        async () => {
          try {
            return await doPost(basicUser, basicPass);
          } catch (err) {
            const msg =
              err?.response?.data?.Error?.ErrorMessage ||
              err?.response?.data?.Message ||
              err?.message ||
              "";

            const looksLikeAuthHeaderIssue =
              /Empty Header in request/i.test(String(msg)) ||
              /Invalid Login Credentials/i.test(String(msg));

            const fallbackUser = String(cfg?.credentials?.tboUSerName || "").trim();
            const fallbackPass = String(cfg?.credentials?.tboPassword || "").trim();

            if (isHotelSvcEndpoint && looksLikeAuthHeaderIssue && fallbackUser && fallbackPass) {
              logger.warn("TBO HOTEL BOOK RETRY WITH FALLBACK CREDS", {
                env,
                endpoint,
                baseType,
              });
              return await doPost(fallbackUser, fallbackPass);
            }

            throw err;
          }
        },
        { label: `tokenPost:${baseType}:${normalizedEndpoint}` },
      );

      try {
        throwIfTboBodyError(data, `token ${normalizedEndpoint}`);
      } catch (err) {
        // If TokenId session expired, refresh token and retry once.
        if (
          _attempt === 0 &&
          err instanceof ApiError &&
          isTokenSessionExpiredMessage(err.message)
        ) {
          logger.warn("TBO TOKEN SESSION EXPIRED (TOKEN API) -> REAUTH", {
            env,
            endpoint: normalizedEndpoint,
            baseType,
          });
          this.tokens[env] = { value: null, expiry: 0 };
          await this.authenticate(env);
          return this.tokenPost(endpoint, payload, baseType, _attempt + 1);
        }
        throw err;
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const ex = extractProviderError(err);
      if (
        typeof ex?.message === "string" &&
        /Empty Header in request/i.test(ex.message)
      ) {
        // This error is almost always misconfigured supplier creds or missing required header fields.
        // Provide an actionable hint without leaking secrets.
        throw new ApiError(
          502,
          `TBO token ${endpoint} failed: ${ex.message}. Check TBO credentials (username/password/clientId) and TBO_END_USER_IP for env '${env}'.`,
        );
      }
      logger.error("TBO TOKEN ERROR", {
        env,
        baseType,
        endpoint,
        status: ex.status,
        code: ex.code,
        message: ex.message,
        data: ex.data,
      });
      throw new ApiError(500, `TBO token API failed: ${ex.message}`);
    }
  }

  /* =====================================================
     STATIC SERVICES
  ====================================================== */

  async getCountryList() {
    const env = this.getEnv();
    return this.staticGet(config[env].endpoints.countryList);
  }

  async getCityList(countryCode) {
    const env = this.getEnv();
    const cfg = config[env];

    try {
      logger.info("TBO CITY LIST", { env, countryCode });
      const { data } = await withRetries(
        () =>
          axios.post(
            `${cfg.staticBase}${cfg.endpoints.cityLIst}`,
            {
              CountryCode: countryCode,
            },
            {
              auth: {
                username: cfg.credentials.tboUSerName,
                password: cfg.credentials.tboPassword,
              },
              timeout: config.timeout,
            },
          ),
        { label: "getCityList" },
      );

      // Check if TBO returned an error status despite HTTP 200
      if (data?.Status?.Code !== 200) {
        logger.error("TBO CITY API ERROR WRAPPER", data?.Status);
        throw new ApiError(
          data?.Status?.Code || 500,
          data?.Status?.Description || "TBO City API failed",
        );
      }

      return data;
    } catch (err) {
      logger.error("TBO CITY POST ERROR", err.response?.data || err.message);
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "TBO city API failed");
    }
  }

  async getTBOHotelCodeList(cityCode, pageIndex = 1) {
    if (!cityCode) throw new ApiError(400, "cityCode required");

    const env = this.getEnv();
    const cfg = config[env];

    try {
      const { data } = await withRetries(
        () =>
          axios.post(
            `${cfg.staticBase}${cfg.endpoints.hotelCodeList}`,
            {
              CityCode: cityCode,
              PageIndex: pageIndex,
            },
            {
              auth: {
                username: cfg.credentials.tboUSerName,
                password: cfg.credentials.tboPassword,
              },
              timeout: config.timeout,
            },
          ),
        { label: "getTBOHotelCodeList" },
      );

      return data;
    } catch (err) {
      logger.error(
        "TBO HOTEL CODE LIST ERROR",
        err.response?.data || err.message,
      );
      throw new ApiError(500, "TBO hotel code list failed");
    }
  }

  async getStaticHotelDetails(hotelCode) {
    if (!hotelCode) throw new ApiError(400, "hotelCode required");

    const env = this.getEnv();
    const cfg = config[env];

    try {
      const { data } = await withRetries(
        () =>
          axios.post(
            `${cfg.staticBase}${cfg.endpoints.hotelDetails}`,
            {
              Hotelcodes: hotelCode,
            },
            {
              auth: {
                username: cfg.credentials.tboUSerName,
                password: cfg.credentials.tboPassword,
              },
              timeout: config.timeout,
            },
          ),
        { label: "getStaticHotelDetails" },
      );

      return data;
    } catch (err) {
      logger.error("STATIC HOTEL DETAILS ERROR", {
        env,
        message: err?.message,
        data: err?.response?.data,
      });
      throw new ApiError(500, "TBO static hotel details failed");
    }
  }
  /* =====================================================
     HOTEL SEARCH (base1 + Basic + Token)
  ====================================================== */
  async searchHotels(params) {
    try {
      const traceId = params?.TraceId || params?.traceId;
      const cityId =
        params?.CityId ||
        params?.cityId ||
        params?.CityCode ||
        params?.cityCode;
      const hotelCodes = params?.HotelCodes || params?.hotelCodes;

      const payload = {
        ...(traceId ? { TraceId: traceId } : {}),
        CheckIn: toYmd(
          params?.CheckIn || params?.checkInDate || params?.checkIn,
        ),
        CheckOut: toYmd(
          params?.CheckOut || params?.checkOutDate || params?.checkOut,
        ),
        ...(cityId ? { CityId: String(cityId) } : {}),
        ...(hotelCodes ? { HotelCodes: hotelCodes } : {}),
        GuestNationality:
          params?.GuestNationality ||
          params?.guestNationality ||
          params?.nationality ||
          "IN",
        NoOfRooms: params?.NoOfRooms || params?.noOfRooms,
        PaxRooms: params?.PaxRooms,
        IsDetailedResponse:
          params?.IsDetailedResponse !== undefined
            ? params.IsDetailedResponse
            : true,
        Filters: params?.Filters || {
          Refundable: false,
          MealType: "All",
        },
      };

      // Normalize PaxRooms so we work with both our UI shape (ChildrenAges) and TBO variants (ChildAge).
      if (Array.isArray(payload.PaxRooms)) {
        payload.PaxRooms = payload.PaxRooms.map((r) => {
          const agesRaw = r?.ChildrenAges ?? r?.ChildAge ?? r?.ChildAges ?? [];
          const ages = Array.isArray(agesRaw) ? agesRaw : [];
          return {
            Adults: Number(r?.Adults ?? r?.noOfAdults ?? 1),
            Children: Number(r?.Children ?? r?.noOfChild ?? 0),
            // Keep both keys for maximum supplier compatibility.
            ChildrenAges: ages,
            ChildAge: ages,
          };
        });
      }

      if (!payload.PaxRooms && Array.isArray(params?.roomGuests)) {
        payload.PaxRooms = params.roomGuests.map((rg) => ({
          Adults: rg?.noOfAdults ?? rg?.Adults ?? 1,
          Children: rg?.noOfChild ?? rg?.Children ?? 0,
          ChildAge: rg?.childAge ?? rg?.ChildAge ?? [],
        }));
      }

      if (!payload.NoOfRooms && Array.isArray(payload.PaxRooms)) {
        payload.NoOfRooms = payload.PaxRooms.length;
      }

      if (!payload.CheckIn || !payload.CheckOut) {
        throw new ApiError(400, "checkInDate and checkOutDate are required");
      }
      if (!payload.CityId && !payload.HotelCodes) {
        throw new ApiError(400, "cityId (or HotelCodes) is required");
      }

      logger.info("TBO HOTEL SEARCH", {
        env: this.getEnv(),
        traceId: payload.TraceId,
        cityId: payload.CityId,
        noOfRooms: payload.NoOfRooms,
      });

      return await this.affiliatePost(
        config[this.getEnv()].endpoints.hotelSearch,
        payload,
      );
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const ex = extractProviderError(err);
      logger.error("TBO HOTEL SEARCH ERROR", {
        env: this.getEnv(),
        message: ex.message,
        status: ex.status,
        data: ex.data,
      });
      throw new ApiError(500, `TBO hotel search request failed: ${ex.message}`);
    }
  }
  /* =====================================================
     HOTEL PRE BOOK (base1 + Basic + Token)
  ====================================================== */
  async preBookHotel(payload) {
    const norm = normalizeTraceHotelIndex(payload);
    if (!norm.HotelCode) throw new ApiError(400, "hotelCode is required");
    if (!norm.ResultIndex)
      throw new ApiError(400, "roomIndex/resultIndex is required");

    const extra = { ...(payload || {}) };
    delete extra.TraceId;
    delete extra.traceId;
    delete extra.traceID;
    delete extra.HotelCode;
    delete extra.hotelCode;
    delete extra.hotelcode;
    delete extra.ResultIndex;
    delete extra.resultIndex;
    delete extra.roomIndex;
    delete extra.roomindex;

    // Per project requirement: do not send TraceId in the initial PreBook request.
    // If the supplier rejects the request due to missing TraceId, we retry once with TraceId (if available).
    const requestPayloadNoTrace = {
      ...extra,
      HotelCode: norm.HotelCode,
      ResultIndex: norm.ResultIndex,
    };

    logger.info("TBO HOTEL PREBOOK", {
      env: this.getEnv(),
      hotelCode: norm.HotelCode,
      resultIndex: norm.ResultIndex,
    });

    const endpoint = config[this.getEnv()].endpoints.hotelPreBook;

    try {
      return await this.affiliatePost(endpoint, requestPayloadNoTrace);
    } catch (err) {
      // Some supplier configurations require TraceId even if the expected contract suggests otherwise.
      if (!norm.TraceId) throw err;

      const msg = String(err?.message || "");
      if (!/trace\s*id/i.test(msg)) throw err;

      logger.warn("TBO HOTEL PREBOOK RETRY WITH TRACEID", {
        env: this.getEnv(),
        traceId: norm.TraceId,
        hotelCode: norm.HotelCode,
        resultIndex: norm.ResultIndex,
      });

      return await this.affiliatePost(endpoint, {
        ...requestPayloadNoTrace,
        TraceId: norm.TraceId,
      });
    }
  }

  /* =====================================================
     HOTEL BOOK (base)
  ====================================================== */
  async bookHotel(payload) {
    // Accept both raw TBO payload and internal camelCase payload. For raw payload, we pass through.
    // For internal payload, we at least normalize the core identifiers so production errors are obvious.
    const norm = normalizeTraceHotelIndex(payload);
    const requestPayload = {
      ...payload,
      ...(norm.TraceId ? { TraceId: norm.TraceId } : {}),
      ...(norm.HotelCode ? { HotelCode: norm.HotelCode } : {}),
      ...(norm.ResultIndex ? { ResultIndex: norm.ResultIndex } : {}),
    };

    return this.tokenPost(
      config[this.getEnv()].endpoints.hotelBook,
      requestPayload,
      // Booking endpoints are served from hotelbe.tektravels.com (base2). Using base can trigger redirects
      // which may strip auth headers and cause "Empty Header in request".
      "base2",
    );
  }

  /* =====================================================
     GENERATE VOUCHER (base)
  ====================================================== */
  async generateVoucher(payload) {
    return this.tokenPost(
      config[this.getEnv()].endpoints.generateVoucher,
      payload,
      "base2",
    );
  }

  /* =====================================================
     DYNAMIC HOTEL DETAILS (base1 / base2)
  ====================================================== */
  async getHotelDetails(hotelCode, traceId, resultIndex) {
    return this.tokenPost(
      config[this.getEnv()].endpoints.hotelDetailsDynamic,
      {
        HotelCode: hotelCode,
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      "base1",
    );
  }

  /* =====================================================
     HOTEL ROOM INFO (base1 / base2)
  ====================================================== */
  async getRoomInfo(hotelCode, traceId, resultIndex) {
    return this.tokenPost(
      config[this.getEnv()].endpoints.hotelRoom,
      {
        HotelCode: hotelCode,
        TraceId: traceId,
        ResultIndex: resultIndex,
      },
      "base1",
    );
  }

  /* =====================================================
     GET BOOKING DETAILS (base)
  ====================================================== */
  async getBookingDetails(payload) {
    return this.tokenPost(
      config[this.getEnv()].endpoints.getBookingDetails,
      payload,
      "base2",
    );
  }
}

module.exports = new HotelService();
