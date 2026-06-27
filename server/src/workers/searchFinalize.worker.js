/**
 * Search Finalize Worker — Aggregates chunk results into final search dataset.
 *
 * Architecture:
 *   - Owns its own BullMQ Redis connection (finalize-worker)
 *   - Uses coordinator pool for application data ops
 *   - Decompresses and merges all chunks incrementally
 *   - Emits search_complete via Socket.IO
 *
 * Shutdown: Worker.close() waits for active jobs, then resolves.
 */

const { Worker } = require("bullmq");
const zlib = require("zlib");
const { promisify } = require("util");
const gunzip = promisify(zlib.gunzip);

const { createBullConnection } = require("../queues/connection");
const { FINALIZE_QUEUE_NAME } = require("../queues/search.queue");
const { getConnections } = require("../config/redisConnections");
const redis = getConnections().coordinator;
const logger = require("../utils/logger");
const lockService = require("../modules/searchCoordinator/lock.service");
const cacheService = require("../modules/searchCoordinator/cache.service");
const registryService = require("../modules/searchCoordinator/registry.service");

let ioInstance = null;

function setIOInstance(io) {
  ioInstance = io;
}

// ─── Incremental Decompression ─────────────────────────────────────────

async function aggregateChunksIncrementally(compressedChunks) {
  const allHotels = [];

  for (let i = 0; i < compressedChunks.length; i++) {
    try {
      const decompressed = await gunzip(compressedChunks[i]);
      const hotels = JSON.parse(decompressed.toString("utf-8"));
      if (Array.isArray(hotels)) {
        for (let j = 0; j < hotels.length; j++) {
          allHotels.push(hotels[j]);
        }
      }
    } catch (err) {
      logger.error(`[FinalizeWorker] Failed to decompress chunk ${i + 1}: ${err.message}`);
    }

    // Yield to event loop every 10 chunks to allow heartbeats
    if (i % 10 === 0 && i > 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  return allHotels;
}

// ─── Worker ────────────────────────────────────────────────────────────

const worker = new Worker(
  FINALIZE_QUEUE_NAME,
  async (job) => {
    const { searchId } = job.data;

    const lockToken = await lockService.acquireLock(`finalize:${searchId}`, 60000);
    if (!lockToken) {
      logger.warn(`[FinalizeWorker] Search ${searchId} already being finalized`);
      return { success: false, reason: "Lock already acquired" };
    }

    try {
      logger.info(`[FinalizeWorker] Finalizing search ${searchId}`);

      const resultKey = `search:${searchId}:results`;
      const compressedChunks = await redis.hvalsBuffer(resultKey);

      const allHotels = await aggregateChunksIncrementally(compressedChunks);

      const dataset = {
        hotels: allHotels,
        searchId,
        isStreaming: false,
      };

      await cacheService.setSharedCache(searchId, dataset, 1800);
      await registryService.markRegistryCompleted(searchId);

      if (ioInstance) {
        ioInstance.to(searchId).emit("search_complete", {
          searchId,
          totalHotels: allHotels.length,
          status: "completed",
        });
      }

      await redis.expire(resultKey, 60);

      return { success: true, totalHotels: allHotels.length };
    } finally {
      await lockService.releaseLock(`finalize:${searchId}`, lockToken);
    }
  },
  {
    connection: createBullConnection("finalize-worker"),
    concurrency: 2,
    lockDuration: 120000,       // 2 min — finalization can be slow for large cities
    stalledInterval: 60000,     // 1 min check interval
  }
);

worker.on("error", (err) => {
  logger.error(`[FinalizeWorker] Error: ${err.message}`);
});

module.exports = {
  worker,
  setIOInstance,
};
