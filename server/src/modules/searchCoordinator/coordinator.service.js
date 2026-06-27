const { generateSearchKey } = require("./searchKey.utils");
const registryService = require("./registry.service");
const lockService = require("./lock.service");
const cacheService = require("./cache.service");
const chunkArray = require("../../utils/chunkArray");
const logger = require("../../utils/logger");
const { getConnections } = require("../../config/redisConnections");
const redis = getConnections().coordinator;

/**
 * Dynamic chunk sizing based on hotel code count.
 * Small searches get smaller chunks for faster first-response.
 * Large searches get larger chunks to reduce total Redis/BullMQ overhead.
 *
 * TBO API typically accepts up to 200 hotel codes per request.
 * We stay well under that limit.
 *
 * Chunk size strategy:
 *   ≤300 hotels  → 50 per chunk  (6 chunks max, fast first response)
 *   ≤1000 hotels → 75 per chunk  (up to 14 chunks)
 *   ≤5000 hotels → 100 per chunk (up to 50 chunks)
 *   >5000 hotels → adaptive, targeting ~60 chunks for parallelism
 */
function calculateChunkSize(totalHotelCodes) {
  if (totalHotelCodes <= 300) return 50;
  if (totalHotelCodes <= 1000) return 75;
  if (totalHotelCodes <= 5000) return 100;
  // For very large cities, use adaptive sizing
  // Target: ~50-80 chunks for parallelism, but never exceed 150 per chunk
  const targetChunks = 60;
  const adaptive = Math.ceil(totalHotelCodes / targetChunks);
  return Math.min(Math.max(adaptive, 75), 150);
}

/**
 * Handles incoming search requests. Deduplicates, checks cache, orchestrates.
 *
 * Flow:
 * 1. Check shared cache (fast path — no lock needed)
 * 2. Check registry for in-progress search (attach path — no lock needed)
 * 3. Acquire lock and initialize new search (create path)
 *
 * Lock ownership is tracked via unique tokens to prevent stale-release.
 */
async function handleSearchRequest(payload, hotelCodes) {
  const searchKey = generateSearchKey(payload);

  // 1. Check Shared Cache (fast path — no lock needed)
  const cachedData = await cacheService.getSharedCache(searchKey);
  if (cachedData) {
    logger.info(`[Coordinator] CACHE HIT for ${searchKey}`);
    return {
      searchId: searchKey,
      status: "completed",
      isCached: true,
      hotels: cachedData.hotels || [],
      totalHotelCodes: hotelCodes.length,
    };
  }

  // 2. Check Registry for Active Searches (attach path — no lock needed)
  const existingSearch = await registryService.getRegistryEntry(searchKey);
  if (existingSearch && existingSearch.status !== "completed") {
    logger.info(`[Coordinator] ATTACHING to existing search ${searchKey}`);
    return {
      searchId: searchKey,
      status: existingSearch.status,
      isCached: false,
      hotels: [],
      totalHotelCodes: hotelCodes.length,
    };
  }

  // 3. Acquire Initialization Lock (create path)
  // Lock returns a unique token — only the holder can release it.
  const lockToken = await lockService.acquireLock(searchKey, 10000);
  if (!lockToken) {
    // Another request just acquired the lock. Return pending — the client
    // will subscribe via WebSocket and receive results when ready.
    logger.info(`[Coordinator] LOCK HELD for ${searchKey}, attaching`);
    return {
      searchId: searchKey,
      status: "pending",
      isCached: false,
      hotels: [],
      totalHotelCodes: hotelCodes.length,
    };
  }

  try {
    // Double-check after acquiring lock (another request may have finished)
    const recheck = await registryService.getRegistryEntry(searchKey);
    if (recheck && recheck.status !== "completed") {
      logger.info(`[Coordinator] DOUBLE-CHECK: search ${searchKey} already exists`);
      return {
        searchId: searchKey,
        status: recheck.status,
        isCached: false,
        hotels: [],
        totalHotelCodes: hotelCodes.length,
      };
    }

    logger.info(`[Coordinator] NEW SEARCH ${searchKey} (${hotelCodes.length} hotels)`);
    const totalHotels = hotelCodes.length;
    if (totalHotels === 0) {
      return {
        searchId: searchKey,
        status: "completed",
        isCached: false,
        hotels: [],
        totalHotelCodes: 0,
      };
    }

    // Dynamic chunk sizing for fairness and throughput
    const chunkSize = calculateChunkSize(totalHotels);
    const chunks = chunkArray(hotelCodes, chunkSize);
    const totalChunks = chunks.length;

    // Create registry entry
    await registryService.createRegistryEntry(searchKey, {
      totalChunks,
      totalHotelCodes: totalHotels,
    });

    // Push all chunks to the pending list in a single atomic MULTI
    const listKey = `pending:chunks:${searchKey}`;
    const multi = redis.multi();

    chunks.forEach((chunkCodes, index) => {
      const jobDef = {
        name: `chunk_${index + 1}_of_${totalChunks}`,
        data: {
          searchId: searchKey,
          chunkNumber: index + 1,
          totalChunks,
          chunkCodes,
          searchPayload: payload,
        },
      };
      multi.rpush(listKey, JSON.stringify(jobDef));
    });

    // Add this search to the active pool so the Dispatcher picks it up
    multi.sadd("active:searches", searchKey);
    // Safety TTL matches registry TTL
    multi.expire(listKey, 1800);

    await multi.exec();

    logger.info(
      `[Coordinator] SEARCH INITIALIZED: ${searchKey} → ${totalChunks} chunks (chunkSize=${chunkSize})`
    );

    return {
      searchId: searchKey,
      status: "running",
      isCached: false,
      hotels: [],
      totalHotelCodes: totalHotels,
    };
  } finally {
    // Release the lock using the ownership token (safe release)
    await lockService.releaseLock(searchKey, lockToken);
  }
}

module.exports = {
  handleSearchRequest,
  calculateChunkSize,
};
