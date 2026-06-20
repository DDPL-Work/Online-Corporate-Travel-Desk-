const { Worker } = require("bullmq");
const createBullConnection = require("../queues/connection");
const { SEARCH_QUEUE_NAME } = require("../queues/search.queue");
const hotelService = require("../services/tektravels/hotel.service");
const MarkupCalculatorService = require("../modules/markup/services/markupCalculator.service");
const TBOHotelDetails = require("../models/TBOHotelDetails");
const redis = require("../config/redis");
const logger = require("../utils/logger");

// Socket.IO Redis Emitter
const { Emitter } = require("@socket.io/redis-emitter");
const io = new Emitter(redis);

/**
 * Merges TBO Result with Static MongoDB Details.
 * Done at the chunk level to avoid massive Memory GC spikes at the end.
 */
async function mergeDetailsPerChunk(tboHotels) {
  if (!tboHotels || tboHotels.length === 0) return [];
  
  const hotelCodes = tboHotels.map(h => h.HotelCode);
  
  // Fetch details only for this chunk's hotels
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

// Ensure mongoose is connected before workers start processing
// In production, the worker process might be separate from the main API.

const worker = new Worker(
  SEARCH_QUEUE_NAME,
  async (job) => {
    const { searchId, chunkNumber, totalChunks, chunkCodes, searchPayload, corporateId } = job.data;
    const startedAt = Date.now();

    try {
      // 1. Fetch from TBO (Markup is internally applied by hotelService)
      const tboPayload = { ...searchPayload, HotelCodes: chunkCodes.join(",") };
      const tboResponse = await hotelService.searchHotels(tboPayload);

      let processedHotels = [];
      if (tboResponse && tboResponse.HotelResult && tboResponse.HotelResult.length > 0) {
        
        // 2. Merge Static Details (Memory intensive, good that it's chunked)
        processedHotels = await mergeDetailsPerChunk(tboResponse.HotelResult);
      }

      // 3. Save results to Redis Hash mapped by SearchId
      if (processedHotels.length > 0) {
        const resultKey = `search:${searchId}:results`;
        await redis.hset(
          resultKey, 
          job.id, 
          JSON.stringify(processedHotels)
        );
        await redis.expire(resultKey, 900);

        // EMIT PROGRESSIVE CHUNK TO SOCKET
        io.to(searchId).emit("chunk_result", {
          searchId,
          hotels: processedHotels,
          chunkNumber,
          totalChunks
        });
      }

      // 4. Update completed count and check if search is entirely finished
      const completedCount = await redis.hincrby(`search:${searchId}:meta`, 'completedChunks', 1);
      const meta = await redis.hgetall(`search:${searchId}:meta`);
      const total = Number(meta.totalChunks);
      const failed = Number(meta.failedChunks);

      // If all chunks processed, trigger final completion
      if (total > 0 && (completedCount + failed) >= total) {
        const { aggregateFinalResults } = require("../modules/search/search.merge");
        // We lack cityRecord here, but we can pass an empty one or fetch it.
        const finalData = await aggregateFinalResults(searchId, {});
        
        io.to(searchId).emit("search_complete", {
          searchId,
          filterMeta: finalData.filterMeta,
          searchMeta: finalData.searchMeta
        });
      }

      const latencyMs = Date.now() - startedAt;
      return { success: true, hotelsFound: processedHotels.length, latencyMs };

    } catch (error) {
      logger.error(`[Worker] Job ${job.id} failed:`, error.message);
      throw error; // Let BullMQ retry engine handle it
    }
  },
  {
    connection: createBullConnection(),
    concurrency: 5 // Process 5 chunks concurrently per worker pod
  }
);

worker.on("ready", () => {
  logger.info("[Worker] Ready and listening for jobs on queue:", SEARCH_QUEUE_NAME);
});

worker.on("active", (job) => {
  logger.info(`[Worker] Started processing chunk ${job.data.chunkNumber} for search ${job.data.searchId}`);
});

worker.on("completed", (job, returnvalue) => {
  logger.info(`[Worker] Job ${job.id} completed. Found ${returnvalue.hotelsFound} hotels in ${returnvalue.latencyMs}ms.`);
});

worker.on("failed", async (job, err) => {
  logger.warn(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
  
  const maxAttempts = job?.opts?.attempts || 3;
  if (job && job.attemptsMade >= maxAttempts) {
    if (job.data?.searchId) {
       await redis.hincrby(`search:${job.data.searchId}:meta`, 'failedChunks', 1);
    }
  }
});

worker.on("error", (err) => {
  logger.error(`[Worker] Fatal Redis Error: ${err.message}`);
});

module.exports = worker;
