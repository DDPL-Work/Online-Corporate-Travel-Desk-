const { getConnections } = require("../../config/redisConnections");
const redis = getConnections().coordinator;
const logger = require("../../utils/logger");

let ioInstance = null;
let publisherInterval = null;

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
  multi.rpush(bufferKey, JSON.stringify(chunkData));
  multi.sadd("active:buffers", searchKey);
  multi.expire(bufferKey, 900);
  await multi.exec();
}

/**
 * Lua script: atomically drain the active:buffers set AND aggregate all buffer lists.
 * Returns: { searchKey1: [hotelsJson, chunkCount], searchKey2: [...], ... }
 *
 * This eliminates the smembers + del race condition where a worker push
 * between smembers and del would strand that search's results.
 */
const DRAIN_ALL_BUFFERS_SCRIPT = `
local setActive = KEYS[1]
local searchIds = redis.call("smembers", setActive)
if #searchIds == 0 then return {} end
-- Atomically delete the set so new pushes re-add cleanly
redis.call("del", setActive)
local results = {}
for i, sid in ipairs(searchIds) do
  local bufKey = "stream:" .. sid .. ":buffer"
  local items = redis.call("lrange", bufKey, 0, -1)
  redis.call("del", bufKey)
  if #items > 0 then
    local hotels = {}
    for j, raw in ipairs(items) do
      local ok, parsed = pcall(cjson.decode, raw)
      if ok and parsed.hotels and type(parsed.hotels) == "table" then
        for k, h in ipairs(parsed.hotels) do
          hotels[#hotels + 1] = h
        end
      end
    end
    results[sid] = {cjson.encode(hotels), #items}
  end
end
return results
`;

let drainAllBuffersSha = null;

/**
 * Periodically aggregates and flushes all buffered chunks to Socket.IO rooms.
 * Runs on the main server process (usually inside server.js).
 *
 * Uses a SINGLE Lua script that atomically:
 * 1. Drains the active:buffers set (prevents race with concurrent worker pushes)
 * 2. Iterates each search key and drains its buffer list
 * 3. Aggregates hotels inline in Redis (avoids Node.js JSON.parse per chunk)
 *
 * Returns a table keyed by searchId → {hotelsJson, chunkCount}
 */
function startPublisherLoop(intervalMs = 250) {
  publisherInterval = setInterval(async () => {
    if (!ioInstance) return;

    try {
      let results;

      try {
        if (drainAllBuffersSha) {
          results = await redis.evalsha(drainAllBuffersSha, 1, "active:buffers");
        } else {
          results = await redis.eval(DRAIN_ALL_BUFFERS_SCRIPT, 1, "active:buffers");
          try {
            drainAllBuffersSha = await redis.script("LOAD", DRAIN_ALL_BUFFERS_SCRIPT);
          } catch (e) { /* ignore — will use EVAL next time */ }
        }
      } catch (scriptErr) {
        if (scriptErr.message && scriptErr.message.includes('NOSCRIPT')) {
          results = await redis.eval(DRAIN_ALL_BUFFERS_SCRIPT, 1, "active:buffers");
          try {
            drainAllBuffersSha = await redis.script("LOAD", DRAIN_ALL_BUFFERS_SCRIPT);
          } catch (e) { /* ignore */ }
        } else {
          throw scriptErr;
        }
      }

      if (!results || Object.keys(results).length === 0) return;

      for (const searchKey of Object.keys(results)) {
        const [hotelsJson, chunkCount] = results[searchKey];

        if (chunkCount > 0 && hotelsJson) {
          let aggregatedHotels;
          try {
            aggregatedHotels = JSON.parse(hotelsJson);
          } catch (e) {
            continue;
          }

          if (aggregatedHotels.length > 0) {
            ioInstance.to(searchKey).emit("chunk_result", {
              searchId: searchKey,
              hotels: aggregatedHotels,
              batchedChunksCount: chunkCount,
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch (err) {
      logger.error("[SocketPublisher] Loop error:", err.message);
    }
  }, intervalMs);

  // Phase 6: .unref() so interval doesn't prevent process exit
  publisherInterval.unref();
}

/**
 * Stops the publisher interval loop.
 * Called during graceful shutdown to prevent firing against closed connections.
 */
function stopPublisherLoop() {
  if (publisherInterval) {
    clearInterval(publisherInterval);
    publisherInterval = null;
    logger.info("[SocketPublisher] Loop stopped");
  }
}

module.exports = {
  setIOInstance,
  pushToBuffer,
  startPublisherLoop,
  stopPublisherLoop,
};
