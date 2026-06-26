/**
 * Search Chunk Worker — Processes hotel search chunks from BullMQ.
 *
 * Architecture:
 *   - Owns its own BullMQ Redis connection (search-chunk-worker)
 *   - Uses coordinator pool for application data ops (hget, hset, rpush)
 *   - LRU cache for hotel details to avoid repeated Mongo queries
 *   - Adaptive concurrency based on CPU, memory, TBO latency
 *
 * Shutdown: Worker.close() waits for active jobs, then resolves.
 */

const { Worker } = require("bullmq");
const zlib = require("zlib");
const { promisify } = require("util");
const gzip = promisify(zlib.gzip);
const { createBullConnection } = require("../queues/connection");
const { SEARCH_QUEUE_NAME, finalizeQueue } = require("../queues/search.queue");
const hotelService = require("../services/tektravels/hotel.service");
const TBOHotelDetails = require("../models/TBOHotelDetails");
const { getConnections } = require("../config/redisConnections");
const redis = getConnections().coordinator;
const logger = require("../utils/logger");
const socketPublisher = require("../modules/searchCoordinator/socketPublisher.service");
const registryService = require("../modules/searchCoordinator/registry.service");

// ─── LRU Cache ─────────────────────────────────────────────────────────

const detailsCache = new Map();
const DETAILS_CACHE_MAX_SIZE = 1000;
const DETAILS_CACHE_TTL_MS = 300000;

function getCachedDetails(hotelCodes) {
  // Build cache key without spreading — use sorted comma-join
  const sorted = hotelCodes.slice().sort();
  const cacheKey = sorted.join(",");
  const cached = detailsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < DETAILS_CACHE_TTL_MS) {
    detailsCache.delete(cacheKey);
    detailsCache.set(cacheKey, cached);
    return cached.data;
  }
  if (cached) detailsCache.delete(cacheKey);
  return null;
}

function setCachedDetails(hotelCodes, data) {
  const sorted = hotelCodes.slice().sort();
  const cacheKey = sorted.join(",");
  detailsCache.delete(cacheKey);
  if (detailsCache.size >= DETAILS_CACHE_MAX_SIZE) {
    const oldestKey = detailsCache.keys().next().value;
    detailsCache.delete(oldestKey);
  }
  detailsCache.set(cacheKey, { data, timestamp: Date.now() });
}

// ─── Hotel Details Merge ───────────────────────────────────────────────

async function mergeDetailsPerChunk(tboHotels) {
  if (!tboHotels || tboHotels.length === 0) return [];

  const hotelCodes = tboHotels.map((h) => h.HotelCode);

  let detailsMap = getCachedDetails(hotelCodes);

  if (!detailsMap) {
    const details = await TBOHotelDetails.find({ hotelCode: { $in: hotelCodes } })
      .select(
        "hotelCode hotelName address cityName countryName hotelRating description images hotelFacilities map image"
      )
      .lean();

    detailsMap = details.reduce((acc, curr) => {
      acc[curr.hotelCode] = curr;
      return acc;
    }, {});

    setCachedDetails(hotelCodes, detailsMap);
  }

  const result = new Array(tboHotels.length);
  for (let i = 0; i < tboHotels.length; i++) {
    const hotel = tboHotels[i];
    const detail = detailsMap[hotel.HotelCode] || {};
    result[i] = {
      ...hotel,
      HotelName: detail.hotelName || hotel.HotelName || "Hotel",
      Address: detail.address || hotel.Address || "",
      CityName: detail.cityName || hotel.CityName || "",
      CountryName: detail.countryName || hotel.CountryName || "",
      StarRating: detail.hotelRating || hotel.StarRating || 0,
      Description: detail.description || hotel.Description || "",
      Images: detail.images || hotel.Images || [],
      Amenities: detail.hotelFacilities || hotel.Amenities || [],
      Map: detail.map || hotel.Map || "",
      Thumbnail: detail.image || hotel.HotelThumbnail || "",
    };
  }
  return result;
}

// ─── Worker ────────────────────────────────────────────────────────────

const worker = new Worker(
  SEARCH_QUEUE_NAME,
  async (job) => {
    const {
      searchId,
      chunkNumber,
      totalChunks,
      chunkCodes,
      searchPayload,
    } = job.data;
    const startedAt = Date.now();

    try {
      // 0. Check if search was cancelled
      const registryKey = `search:registry:${searchId}`;
      const searchStatus = await redis.hget(registryKey, "status");
      if (searchStatus === "cancelled") {
        logger.info(`[Worker] Skipping cancelled search ${searchId}`);
        return { success: false, reason: "cancelled", latencyMs: 0 };
      }

      // 1. Fetch from TBO
      const tboPayload = { ...searchPayload, HotelCodes: chunkCodes.join(",") };
      const tboResponse = await hotelService.searchHotels(tboPayload);

      let processedHotels = [];
      if (
        tboResponse &&
        tboResponse.HotelResult &&
        tboResponse.HotelResult.length > 0
      ) {
        processedHotels = await mergeDetailsPerChunk(tboResponse.HotelResult);
      }

      // 2. Push to streaming buffer FIRST, then compress as background work
      if (processedHotels.length > 0) {
        await socketPublisher.pushToBuffer(searchId, {
          hotels: processedHotels,
          chunkNumber,
          totalChunks,
        });

        // Background: compress and store in Redis
        const resultKey = `search:${searchId}:results`;
        const jsonString = JSON.stringify(processedHotels);
        const compressed = await gzip(jsonString, { level: 1 });
        try {
          await redis.hsetBuffer(resultKey, job.id, compressed);
          await redis.expire(resultKey, 1800);
        } catch (e) {
          logger.warn(`[Worker] Failed to store compressed chunk: ${e.message}`);
        }
      }

      // 3. Atomic progress update + finalization check
      const shouldFinalize = await registryService.updateProgressAndCheckFinalize(
        searchId, totalChunks, 1, 0
      );
      if (shouldFinalize) {
        await finalizeQueue.add("finalize_search", { searchId });
      }

      const latencyMs = Date.now() - startedAt;
      return {
        success: true,
        hotelsFound: processedHotels.length,
        latencyMs,
      };
    } catch (error) {
      logger.error(`[Worker] Job ${job.id} failed:`, error.message);
      throw error;
    }
  },
  {
    connection: createBullConnection("search-chunk-worker"),
    concurrency: 5,
    lockDuration: 60000,
    stalledInterval: 30000,
    limiter: {
      max: 20,
      duration: 1000,
    },
  }
);

// ─── Worker Event Listeners ────────────────────────────────────────────

worker.on("ready", () => {
  logger.info(`[Worker] Ready on queue: ${SEARCH_QUEUE_NAME}`);
});

worker.on("active", (job) => {
  logger.debug(`[Worker] Chunk ${job.data.chunkNumber} started for ${job.data.searchId}`);
});

worker.on("completed", (job, returnvalue) => {
  logger.info(
    `[Worker] Chunk completed in ${returnvalue.latencyMs}ms with ${returnvalue.hotelsFound} hotels.`
  );
  if (returnvalue.latencyMs) {
    adaptiveState.tboLatencySum += returnvalue.latencyMs;
    adaptiveState.tboLatencyCount++;
  }
});

worker.on("failed", async (job, err) => {
  logger.warn(`[Worker] Chunk failed: ${err.message}`);
  const maxAttempts = job?.opts?.attempts || 3;
  if (job && job.attemptsMade >= maxAttempts) {
    if (job.data?.searchId) {
      try {
        const deadLetterKey = `dead:chunks:${job.data.searchId}`;
        await redis.rpush(deadLetterKey, JSON.stringify({
          chunkNumber: job.data.chunkNumber,
          totalChunks: job.data.totalChunks,
          error: err.message,
          attemptsMade: job.attemptsMade,
          failedAt: Date.now(),
        }));
        await redis.expire(deadLetterKey, 3600);
      } catch (dlErr) {
        logger.warn(`[Worker] Dead-letter write failed: ${dlErr.message}`);
      }

      const shouldFinalize = await registryService.updateProgressAndCheckFinalize(
        job.data.searchId, job.data.totalChunks, 0, 1
      );
      if (shouldFinalize) {
        await finalizeQueue.add("finalize_search", {
          searchId: job.data.searchId,
        });
      }
    }
  }
});

worker.on("error", (err) => {
  logger.error(`[Worker] Error: ${err.message}`);
});

// ─── Adaptive Concurrency (Phase 6: .unref() to prevent leak) ─────────

const adaptiveState = {
  baseConcurrency: 5,
  currentConcurrency: 5,
  minConcurrency: 2,
  maxConcurrency: 20,
  tboLatencySum: 0,
  tboLatencyCount: 0,
};

function adjustConcurrency() {
  const os = require("os");
  const cpuCount = os.cpus().length;
  const cpuLoad = os.loadavg()[0] / cpuCount;
  const freeMem = os.freemem() / os.totalmem();

  const avgTbo = adaptiveState.tboLatencyCount > 0
    ? adaptiveState.tboLatencySum / adaptiveState.tboLatencyCount
    : 500;

  let target = adaptiveState.baseConcurrency;

  if (cpuLoad > 0.8) target = Math.max(2, target - 2);
  else if (cpuLoad > 0.6) target = Math.max(3, target - 1);

  if (freeMem < 0.2) target = Math.max(2, target - 2);
  else if (freeMem < 0.3) target = Math.max(3, target - 1);

  if (avgTbo > 2000) target = Math.max(2, target - 2);
  else if (avgTbo > 1000) target = Math.max(3, target - 1);
  else if (avgTbo < 300) target = Math.min(adaptiveState.maxConcurrency, target + 1);

  target = Math.max(adaptiveState.minConcurrency, Math.min(adaptiveState.maxConcurrency, target));

  if (target !== adaptiveState.currentConcurrency) {
    adaptiveState.currentConcurrency = target;
    worker.concurrency = target;
    logger.info(`[Worker] Concurrency: ${target} (CPU: ${cpuLoad.toFixed(2)}, Mem: ${(freeMem * 100).toFixed(0)}%, TBO: ${avgTbo.toFixed(0)}ms)`);
  }

  adaptiveState.tboLatencySum = 0;
  adaptiveState.tboLatencyCount = 0;
}

const adaptiveInterval = setInterval(adjustConcurrency, 10000);
adaptiveInterval.unref(); // Phase 6: don't prevent process exit

module.exports = worker;
