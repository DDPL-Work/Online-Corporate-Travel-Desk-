const { generateSearchKey } = require("./searchKey.utils");
const registryService = require("./registry.service");
const lockService = require("./lock.service");
const cacheService = require("./cache.service");
const { searchQueue } = require("../../queues/search.queue");
const chunkArray = require("../../utils/chunkArray");
const logger = require("../../utils/logger");

const CHUNK_SIZE = 100;

/**
 * Handles incoming search requests. Deduplicates, checks cache, orchestrates.
 */
async function handleSearchRequest(payload, hotelCodes) {
  const searchKey = generateSearchKey(payload);

  // 1. Check Shared Cache
  const cachedData = await cacheService.getSharedCache(searchKey);
  if (cachedData) {
    logger.info(`[Coordinator] CACHE HIT for ${searchKey}`);
    return {
      searchId: searchKey,
      status: 'completed',
      isCached: true,
      hotels: cachedData.hotels || [], // Finalized hotels
      totalHotelCodes: hotelCodes.length
    };
  }

  // 2. Check Registry for Active Searches
  const existingSearch = await registryService.getRegistryEntry(searchKey);
  if (existingSearch) {
    logger.info(`[Coordinator] ATTACHING to existing search ${searchKey}`);
    return {
      searchId: searchKey,
      status: existingSearch.status,
      isCached: false,
      hotels: [], // Client will subscribe via websocket
      totalHotelCodes: hotelCodes.length
    };
  }

  // 3. Acquire Initialization Lock to prevent race conditions during rapid identical requests
  const locked = await lockService.acquireLock(searchKey, 10000);
  if (!locked) {
    logger.info(`[Coordinator] LOCK LOST for ${searchKey}, spinning up elsewhere`);
    // Another request just acquired the lock and is spawning jobs. We just return.
    return {
      searchId: searchKey,
      status: 'pending',
      isCached: false,
      hotels: [],
      totalHotelCodes: hotelCodes.length
    };
  }

  try {
    // We won the lock. Initialize the massive search!
    logger.info(`[Coordinator] NEW SEARCH ${searchKey}`);
    const totalHotels = hotelCodes.length;
    if (totalHotels === 0) {
      return { searchId: searchKey, status: 'completed', isCached: false, hotels: [], totalHotelCodes: 0 };
    }

    const chunks = chunkArray(hotelCodes, CHUNK_SIZE);
    const totalChunks = chunks.length;

    // Create registry entry
    await registryService.createRegistryEntry(searchKey, { totalChunks, totalHotelCodes: totalHotels });

    // Dispatch to Round-Robin Pending List instead of BullMQ directly
    const listKey = `pending:chunks:${searchKey}`;
    const multi = require("../../config/redis").multi();

    chunks.forEach((chunkCodes, index) => {
      const jobDef = {
        name: `chunk_${index + 1}_of_${totalChunks}`,
        data: {
          searchId: searchKey,
          chunkNumber: index + 1,
          totalChunks,
          chunkCodes,
          searchPayload: payload,
        }
      };
      multi.rpush(listKey, JSON.stringify(jobDef));
    });

    // Add this search to the active pool so the Dispatcher picks it up
    multi.sadd("active:searches", searchKey);
    // Safety TTL so lists don't leak if dispatcher crashes
    multi.expire(listKey, 3600); 

    await multi.exec();

    return {
      searchId: searchKey,
      status: 'running',
      isCached: false,
      hotels: [],
      totalHotelCodes: totalHotels
    };
  } finally {
    // Release the initialization lock
    await lockService.releaseLock(searchKey);
  }
}

module.exports = {
  handleSearchRequest
};
