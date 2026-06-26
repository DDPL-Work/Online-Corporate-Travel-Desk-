const crypto = require("crypto");
const { searchQueue } = require("../../queues/search.queue");
const { getConnections } = require("../../config/redisConnections");
const redis = getConnections().coordinator;
const chunkArray = require("../../utils/chunkArray");

const MAX_TBO_LIMIT = 200;
const MIN_CHUNK_SIZE = 50;

/**
 * Calculates optimal chunk size to balance payload vs concurrent connections.
 * @param {number} totalHotels 
 * @param {number} activeWorkers 
 * @returns {number} chunkSize
 */
function calculateOptimalChunkSize(totalHotels, activeWorkers = 5) {
  // As requested: fixed chunk size of 100 hotel codes per chunk.
  return 100;
}

/**
 * Orchestrates the massive hotel search process by breaking it down into queue jobs.
 * 
 * @param {Array<string>} hotelCodes - All DB hotel codes for the city
 * @param {Object} searchPayload - The base payload for TBO (CheckIn, etc)
 * @returns {string} searchId - A unique ID for tracking progress/results
 */
async function initiateDistributedSearch(hotelCodes, searchPayload) {
  const searchId = `search_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
  
  const totalHotels = hotelCodes.length;
  if (totalHotels === 0) return { searchId, totalChunks: 0 };

  // Assume 10 worker concurrency slots globally for now, can be dynamic
  const chunkSize = calculateOptimalChunkSize(totalHotels, 10);
  const chunks = chunkArray(hotelCodes, chunkSize);
  const totalChunks = chunks.length;

  // Track orchestration metadata in Redis
  const metaKey = `search:${searchId}:meta`;
  await redis.hset(metaKey, {
    totalChunks,
    completedChunks: 0,
    failedChunks: 0,
    status: 'processing',
    createdAt: Date.now()
  });
  await redis.expire(metaKey, 900); // Expire tracking after 15 mins

  // Prepare BullMQ Jobs
  const jobs = chunks.map((chunkCodes, index) => ({
    name: `chunk_${index + 1}_of_${totalChunks}`,
    data: {
      searchId,
      chunkNumber: index + 1,
      totalChunks,
      chunkCodes,
      searchPayload,
      corporateId: searchPayload.corporateId
    }
  }));

  // Add all jobs to the high-priority queue
  await searchQueue.addBulk(jobs);

  return {
    searchId,
    totalChunks,
    chunkSize,
    totalHotels
  };
}

module.exports = {
  initiateDistributedSearch,
  calculateOptimalChunkSize
};
