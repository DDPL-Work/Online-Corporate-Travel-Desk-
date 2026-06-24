const { Worker } = require("bullmq");
const zlib = require("zlib");
const { promisify } = require("util");
const gunzip = promisify(zlib.gunzip);

const createBullConnection = require("../queues/connection");
const { FINALIZE_QUEUE_NAME, cleanupQueue } = require("../queues/search.queue");
const redis = require("../config/redis");
const logger = require("../utils/logger");
const lockService = require("../modules/searchCoordinator/lock.service");
const cacheService = require("../modules/searchCoordinator/cache.service");
const registryService = require("../modules/searchCoordinator/registry.service");

let ioInstance = null;

function setIOInstance(io) {
  ioInstance = io;
}

const worker = new Worker(
  FINALIZE_QUEUE_NAME,
  async (job) => {
    const { searchId } = job.data;

    // 1. Acquire finalization lock to prevent duplicate aggregations
    const locked = await lockService.acquireLock(`finalize:${searchId}`, 60000);
    if (!locked) {
      logger.warn(`[FinalizeWorker] Search ${searchId} is already being finalized`);
      return { success: false, reason: "Lock already acquired" };
    }

    try {
      logger.info(`[FinalizeWorker] Finalizing search ${searchId}`);

      // 2. Fetch all compressed chunk results
      const resultKey = `search:${searchId}:results`;
      const compressedChunks = await redis.hvalsBuffer(resultKey);
      
      let allHotels = [];

      for (const buffer of compressedChunks) {
        try {
          const decompressed = await gunzip(buffer);
          const hotels = JSON.parse(decompressed.toString("utf-8"));
          if (Array.isArray(hotels)) {
            allHotels.push(...hotels);
          }
        } catch (err) {
          logger.error(`[FinalizeWorker] Failed to decompress a chunk: ${err.message}`);
        }
      }

      // 3. Save to Global Cache
      const dataset = {
        hotels: allHotels,
        searchId,
        isStreaming: false
      };

      await cacheService.setSharedCache(searchId, dataset, 1800); // 30 minutes

      // 4. Mark Registry as Completed
      await registryService.markRegistryCompleted(searchId);

      // 5. Emit search_complete
      if (ioInstance) {
        ioInstance.to(searchId).emit("search_complete", {
          searchId,
          totalHotels: allHotels.length,
          status: "completed"
        });
      }

      // 6. Schedule Cleanup (Delete temporary result chunks in 1 minute)
      // (Note: we could also just let TTL handle it, but explicit cleanup is cleaner)
      await redis.expire(resultKey, 60);

      return { success: true, totalHotels: allHotels.length };
    } finally {
      await lockService.releaseLock(`finalize:${searchId}`);
    }
  },
  {
    connection: createBullConnection(),
    concurrency: 2
  }
);

worker.on("error", (err) => {
  logger.error(`[FinalizeWorker] Error: ${err.message}`);
});

module.exports = {
  worker,
  setIOInstance
};
