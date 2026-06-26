const { Worker } = require("bullmq");
const zlib = require("zlib");
const { promisify } = require("util");
const gzip = promisify(zlib.gzip);
const createBullConnection = require("../queues/connection");
const { SEARCH_QUEUE_NAME, finalizeQueue } = require("../queues/search.queue");
const hotelService = require("../services/tektravels/hotel.service");
const TBOHotelDetails = require("../models/TBOHotelDetails");
const redis = require("../config/redis");
const logger = require("../utils/logger");
const socketPublisher = require("../modules/searchCoordinator/socketPublisher.service");
const registryService = require("../modules/searchCoordinator/registry.service");

/**
 * Merges TBO Result with Static MongoDB Details.
 */
async function mergeDetailsPerChunk(tboHotels) {
  if (!tboHotels || tboHotels.length === 0) return [];
  
  const hotelCodes = tboHotels.map(h => h.HotelCode);
  
  const details = await TBOHotelDetails.find({ hotelCode: { $in: hotelCodes } })
    .select('hotelCode hotelName address cityName countryName hotelRating description images hotelFacilities map image')
    .lean();
    
  const detailsMap = details.reduce((acc, curr) => {
    acc[curr.hotelCode] = curr;
    return acc;
  }, {});

  return tboHotels.map(hotel => {
    const detail = detailsMap[hotel.HotelCode] || {};
    return {
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
  });
}

const worker = new Worker(
  SEARCH_QUEUE_NAME,
  async (job) => {
    const { searchId, chunkNumber, totalChunks, chunkCodes, searchPayload } = job.data;
    const startedAt = Date.now();

    try {
      // 1. Fetch from TBO
      const tboPayload = { ...searchPayload, HotelCodes: chunkCodes.join(",") };
      const tboResponse = await hotelService.searchHotels(tboPayload);

      let processedHotels = [];
      if (tboResponse && tboResponse.HotelResult && tboResponse.HotelResult.length > 0) {
        processedHotels = await mergeDetailsPerChunk(tboResponse.HotelResult);
      }

      // 2. Save compressed results and push to buffer
      if (processedHotels.length > 0) {
        const resultKey = `search:${searchId}:results`;
        
        // Compress data to save massive Redis memory (reduces size by 90%)
        const jsonString = JSON.stringify(processedHotels);
        const compressed = await gzip(jsonString);
        
        // Store as buffer
        await redis.hsetBuffer(resultKey, job.id, compressed);
        await redis.expire(resultKey, 900);

        // Push to streaming buffer (decoupled from sockets)
        await socketPublisher.pushToBuffer(searchId, {
          hotels: processedHotels,
          chunkNumber,
          totalChunks
        });
      }

      // 3. Update Registry and check for finalization
      await registryService.updateRegistryProgress(searchId, 1, 0);
      
      const registryEntry = await registryService.getRegistryEntry(searchId);
      if (registryEntry) {
        const total = Number(registryEntry.totalChunks);
        const completedCount = Number(registryEntry.completedChunks);
        const failedCount = Number(registryEntry.failedChunks);

        // If completely done, trigger the finalizer queue!
        if (total > 0 && (completedCount + failedCount) >= total) {
          await finalizeQueue.add("finalize_search", { searchId });
        }
      }

      const latencyMs = Date.now() - startedAt;
      return { success: true, hotelsFound: processedHotels.length, latencyMs };

    } catch (error) {
      logger.error(`[Worker] Job ${job.id} failed:`, error.message);
      throw error;
    }
  },
  {
    connection: createBullConnection(),
    concurrency: 5,
    lockDuration: 120000,
    stalledInterval: 60000,
    limiter: {
      max: 20,       // Rate limit TBO API globally
      duration: 1000 // 20 requests per 1000ms
    }
  }
);

worker.on("ready", () => {
  logger.info("[Worker] Ready and listening for jobs on queue:", SEARCH_QUEUE_NAME);
});

worker.on("active", (job) => {
  logger.info(`[Worker] Started chunk ${job.data.chunkNumber} for search ${job.data.searchId}`);
});

worker.on("completed", (job, returnvalue) => {
  logger.info(`[Worker] Chunk completed in ${returnvalue.latencyMs}ms with ${returnvalue.hotelsFound} hotels.`);
});

worker.on("failed", async (job, err) => {
  logger.warn(`[Worker] Chunk failed with error: ${err.message}`);
  const maxAttempts = job?.opts?.attempts || 3;
  if (job && job.attemptsMade >= maxAttempts) {
    if (job.data?.searchId) {
       await registryService.updateRegistryProgress(job.data.searchId, 0, 1);
       // Also check if we need to finalize even on failure
       const registryEntry = await registryService.getRegistryEntry(job.data.searchId);
       if (registryEntry) {
         const total = Number(registryEntry.totalChunks);
         const completedCount = Number(registryEntry.completedChunks);
         const failedCount = Number(registryEntry.failedChunks);
         if (total > 0 && (completedCount + failedCount) >= total) {
           await finalizeQueue.add("finalize_search", { searchId: job.data.searchId });
         }
       }
    }
  }
});

worker.on("error", (err) => {
  logger.error(`[Worker] Fatal Redis Error: ${err.message}`);
});

module.exports = worker;
