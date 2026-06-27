const { getConnections } = require("../../config/redisConnections");
const redis = getConnections().coordinator;
const { buildHotelFilterMeta, prepareHotelsForFiltering } = require("../../utils/filterHotels");
const logger = require("../../utils/logger");

const deduplicateHotels = (hotels = []) => {
  const seenKeys = new Set();
  const uniqueHotels = [];

  for (let i = 0; i < hotels.length; i++) {
    const hotel = hotels[i];
    const hotelCodeKey = hotel?.HotelCode ? String(hotel.HotelCode).trim() : "";
    const compositeKey = `${String(hotel?.HotelName || "").trim().toLowerCase()}|${String(hotel?.CityName || hotel?.City || "").trim().toLowerCase()}|${String(hotel?.Address || "").trim().toLowerCase()}`;
    const key = hotelCodeKey || compositeKey || `row-${uniqueHotels.length}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueHotels.push(hotel);
    }
  }

  return uniqueHotels;
};

/**
 * Aggregates all processed chunk results from Redis, deduplicates, and generates filters.
 * @param {string} searchId 
 */
async function aggregateFinalResults(searchId, cityRecord) {
  const metaKey = `search:${searchId}:meta`;
  const resultKey = `search:${searchId}:results`;

  // 1. Fetch metadata
  const meta = await redis.hgetall(metaKey);
  
  // 2. Fetch all chunk arrays from Hash (using hvals to get all values)
  const chunkDataStrings = await redis.hvals(resultKey);
  
  let allHotels = [];
  
  // Stream parse to avoid blocking if possible, or just parse incrementally
  for (const chunkStr of chunkDataStrings) {
    try {
      // Yield to the event loop between chunks to allow BullMQ heartbeats
      await new Promise(resolve => setImmediate(resolve));
      const parsed = JSON.parse(chunkStr);
      if (Array.isArray(parsed)) {
        // Batch push avoids stack overflow on large arrays (push.apply limit ~65k args)
        for (let i = 0; i < parsed.length; i += 1000) {
          allHotels.push.apply(allHotels, parsed.slice(i, i + 1000));
        }
      }
    } catch (e) {
      logger.error(`[Aggregate] Failed to parse a chunk result for ${searchId}`);
    }
  }

  // 3. Deduplicate
  allHotels = deduplicateHotels(allHotels);

  // 4. Filters & Preps
  const preparedHotels = prepareHotelsForFiltering(allHotels);
  const filterMeta = buildHotelFilterMeta(preparedHotels);
  const finalHotels = preparedHotels.map(({ hotel }) => hotel);

  // 5. Cleanup temporary keys
  await redis.del(resultKey);
  // Optional: keep metaKey around for historical metrics, or delete it
  
  return {
    CityCode: cityRecord?.cityCode || "",
    CityName: cityRecord?.cityName || "",
    CountryCode: cityRecord?.countryCode || "",
    CountryName: cityRecord?.countryName || "",
    hotels: finalHotels,
    HotelResult: finalHotels,
    pagination: {
      total: finalHotels.length,
      page: 1,
      limit: finalHotels.length,
      offset: 0,
      hasMore: false,
    },
    filterMeta,
    traceId: searchId,
    searchMeta: {
      cacheHit: false, // Since this is the aggregation of fresh data
      totalChunks: Number(meta.totalChunks) || 0,
      failedChunkCount: Number(meta.failedChunks) || 0,
      partialResults: Number(meta.failedChunks) > 0,
      elapsedMs: Date.now() - Number(meta.createdAt),
      searchId
    }
  };
}

/**
 * Polling helper for the API to wait for completion.
 * In production, it's better to use SSE (Server Sent Events) from the client.
 */
async function waitForSearchCompletion(searchId, timeoutMs = 60000) {
  const metaKey = `search:${searchId}:meta`;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const meta = await redis.hgetall(metaKey);
    const total = Number(meta.totalChunks);
    const completed = Number(meta.completedChunks);
    const failed = Number(meta.failedChunks);

    if (total > 0 && (completed + failed) >= total) {
      return true; // Done
    }

    // Wait 500ms before checking again
    await new Promise(res => setTimeout(res, 500));
  }
  
  throw new Error("Search timed out waiting for chunks to complete.");
}

module.exports = {
  aggregateFinalResults,
  waitForSearchCompletion
};
