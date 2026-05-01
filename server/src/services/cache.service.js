const redis = require("../config/redis");
const logger = require("../utils/logger");

const DEFAULT_SEARCH_CACHE_TTL_SECONDS = 600;
const REFRESH_THRESHOLD_SECONDS = 120;
const REFRESH_LOCK_TTL_SECONDS = 90;

const normalizeGuestConfig = (room = {}) => {
  const adults = Number(room.Adults || room.adults || 0);
  const children = Number(room.Children || room.children || 0);
  const ages = room.ChildrenAges || room.childrenAges || [];
  const childAges = Array.isArray(ages)
    ? ages.slice(0, children).map(Number).sort().join("-")
    : "";

  return `a${adults}c${children}${childAges ? `-${childAges}` : ""}`;
};

const buildSearchCacheKey = ({
  CityCode,
  CheckIn,
  CheckOut,
  GuestNationality = "IN",
  NoOfRooms = 1,
  PaxRooms = [],
}) => {
  // Normalize dates to YYYY-MM-DD to avoid time-zone or format variations
  const fmtDate = (d) => (d ? String(d).split("T")[0] : "");
  
  const paxSignature = `r${Number(NoOfRooms) || 1}:${(PaxRooms || [])
    .map(normalizeGuestConfig)
    .join("|")}`;

  const key = `search:${String(CityCode || "").trim()}:${fmtDate(CheckIn)}:${fmtDate(CheckOut)}:${paxSignature}:${String(
    GuestNationality || "IN",
  ).trim().toUpperCase()}`;

  return key;
};

const getSearchResults = async (cacheKey) => {
  try {
    const raw = await redis.get(cacheKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.error(
      `[hotel-search-cache] GET failed for ${cacheKey}: ${error.message}`,
    );
    return null;
  }
};

const setSearchResults = async (
  cacheKey,
  value,
  ttlSeconds = DEFAULT_SEARCH_CACHE_TTL_SECONDS,
) => {
  try {
    const payload = JSON.stringify({
      ...value,
      cachedAt: new Date().toISOString(),
    });

    await redis.setex(cacheKey, ttlSeconds, payload);
  } catch (error) {
    logger.error(
      `[hotel-search-cache] SET failed for ${cacheKey}: ${error.message}`,
    );
  }
};

const getTtl = async (cacheKey) => {
  try {
    return await redis.ttl(cacheKey);
  } catch (error) {
    logger.error(
      `[hotel-search-cache] TTL failed for ${cacheKey}: ${error.message}`,
    );
    return -1;
  }
};

const refreshInBackground = async ({
  cacheKey,
  refreshFn,
  refreshThresholdSeconds = REFRESH_THRESHOLD_SECONDS,
}) => {
  if (typeof refreshFn !== "function") return false;

  const ttl = await getTtl(cacheKey);
  if (ttl === -2 || ttl === -1 || ttl > refreshThresholdSeconds) {
    return false;
  }

  const lockKey = `${cacheKey}:refreshing`;

  try {
    const acquired = await redis.set(
      lockKey,
      "1",
      "EX",
      REFRESH_LOCK_TTL_SECONDS,
      "NX",
    );

    if (acquired !== "OK") return false;

    setImmediate(() => {
      Promise.resolve()
        .then(refreshFn)
        .catch((error) => {
          logger.error(
            `[hotel-search-cache] Background refresh failed for ${cacheKey}: ${error.message}`,
          );
        })
        .finally(async () => {
          try {
            await redis.del(lockKey);
          } catch (error) {
            logger.error(
              `[hotel-search-cache] Failed to release refresh lock for ${cacheKey}: ${error.message}`,
            );
          }
        });
    });

    return true;
  } catch (error) {
    logger.error(
      `[hotel-search-cache] Background refresh setup failed for ${cacheKey}: ${error.message}`,
    );
    return false;
  }
};

module.exports = {
  DEFAULT_SEARCH_CACHE_TTL_SECONDS,
  buildSearchCacheKey,
  getSearchResults,
  setSearchResults,
  getTtl,
  refreshInBackground,
};
