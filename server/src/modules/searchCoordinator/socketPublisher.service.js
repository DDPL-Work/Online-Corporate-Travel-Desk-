const redis = require("../../config/redis");
const logger = require("../../utils/logger");

let ioInstance = null;

function setIOInstance(io) {
  ioInstance = io;
}

/**
 * Pushes a chunk result to a Redis buffer for a given search key.
 * Used by worker nodes to hand off results to the publisher.
 */
async function pushToBuffer(searchKey, chunkData) {
  const bufferKey = `stream:${searchKey}:buffer`;
  const multi = redis.multi();
  // Push stringified chunk to the list
  multi.rpush(bufferKey, JSON.stringify(chunkData));
  // Register this searchKey as having active buffered items
  multi.sadd("active:buffers", searchKey);
  // Keep list alive for a short time
  multi.expire(bufferKey, 900);
  await multi.exec();
}

/**
 * Periodically aggregates and flushes all buffered chunks to Socket.IO rooms.
 * Runs on the main server process (usually inside server.js).
 */
function startPublisherLoop(intervalMs = 250) {
  setInterval(async () => {
    if (!ioInstance) return;

    try {
      // Get all active search keys that have pending chunks in buffer
      const searchKeys = await redis.smembers("active:buffers");
      if (!searchKeys || searchKeys.length === 0) return;

      // Clear the set immediately so workers can populate it again for the next interval
      await redis.del("active:buffers");

      for (const searchKey of searchKeys) {
        const key = `stream:${searchKey}:buffer`;
        
        // Atomically pop all items and delete the list
        const multi = redis.multi();
        multi.lrange(key, 0, -1);
        multi.del(key);
        const results = await multi.exec();

        const rawChunks = results[0][1]; // result of lrange
        if (rawChunks && rawChunks.length > 0) {
          // Aggregate all hotel arrays from all chunks collected in this interval
          let aggregatedHotels = [];
          
          for (const raw of rawChunks) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed.hotels && Array.isArray(parsed.hotels)) {
                aggregatedHotels.push(...parsed.hotels);
              }
            } catch (err) {}
          }

          if (aggregatedHotels.length > 0) {
            // Emit ONE SINGLE batched update to the room for all subscribers!
            ioInstance.to(searchKey).emit("chunk_result", {
              searchId: searchKey,
              hotels: aggregatedHotels,
              batchedChunksCount: rawChunks.length,
              timestamp: Date.now()
            });
          }
        }
      }
    } catch (err) {
      logger.error("[SocketPublisher] Loop error:", err.message);
    }
  }, intervalMs);
}

module.exports = {
  setIOInstance,
  pushToBuffer,
  startPublisherLoop
};
