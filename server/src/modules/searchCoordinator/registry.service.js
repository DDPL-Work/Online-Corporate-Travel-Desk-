const { getConnections } = require("../../config/redisConnections");
const redis = getConnections().coordinator;

const REGISTRY_TTL_SECONDS = 1800; // 30 minutes

/**
 * Lua script: atomic progress update + finalization check.
 * Combines HINCRBY (progress) + HGET (read) + conditional HSET (mark finalizing)
 * into a single atomic Redis call — eliminates 3 round trips per chunk.
 *
 * Returns:
 *   1 = this caller should trigger finalization (first to reach threshold)
 *   0 = search still in progress
 *  -1 = registry doesn't exist
 *  -2 = already completed or finalizing
 */
const UPDATE_AND_CHECK_FINALIZE_SCRIPT = `
local key = KEYS[1]
local total = tonumber(ARGV[1])
local completedInc = tonumber(ARGV[2])
local failedInc = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local exists = redis.call("exists", key)
if exists == 0 then return -1 end

local status = redis.call("hget", key, "status")
if status == "completed" or status == "finalizing" then return -2 end

if completedInc > 0 then
  redis.call("hincrby", key, "completedChunks", completedInc)
end
if failedInc > 0 then
  redis.call("hincrby", key, "failedChunks", failedInc)
end
redis.call("expire", key, ttl)

local completed = tonumber(redis.call("hget", key, "completedChunks") or "0")
local failed = tonumber(redis.call("hget", key, "failedChunks") or "0")
if total > 0 and (completed + failed) >= total then
  redis.call("hset", key, "status", "finalizing")
  return 1
end
return 0
`;

let updateAndCheckSha = null;

/**
 * Legacy finalize check script — kept for recovery service compatibility.
 */
const FINALIZE_CHECK_SCRIPT = `
local key = KEYS[1]
local total = tonumber(ARGV[1])
local exists = redis.call("exists", key)
if exists == 0 then return -1 end
local status = redis.call("hget", key, "status")
if status == "completed" then return 0 end
local completed = tonumber(redis.call("hget", key, "completedChunks") or "0")
local failed = tonumber(redis.call("hget", key, "failedChunks") or "0")
if total > 0 and (completed + failed) >= total then
  redis.call("hset", key, "status", "finalizing")
  return 1
end
return 0
`;

let finalizeScriptSha = null;

async function createRegistryEntry(searchKey, metadata) {
  const key = `search:registry:${searchKey}`;
  const payload = {
    searchId: searchKey,
    status: "running",
    createdAt: Date.now(),
    totalChunks: metadata.totalChunks || 0,
    completedChunks: 0,
    failedChunks: 0,
    totalHotelCodes: metadata.totalHotelCodes || 0,
  };
  const multi = redis.multi();
  multi.hset(key, payload);
  multi.expire(key, REGISTRY_TTL_SECONDS);
  await multi.exec();
  return payload;
}

async function getRegistryEntry(searchKey) {
  const key = `search:registry:${searchKey}`;
  const data = await redis.hgetall(key);
  if (!data || Object.keys(data).length === 0) return null;
  return data;
}

/**
 * Fetches only the fields needed for progress checks.
 * More efficient than HGETALL — avoids fetching unused fields.
 */
async function getRegistryProgress(searchKey) {
  const key = `search:registry:${searchKey}`;
  const data = await redis.hmget(key, "totalChunks", "completedChunks", "failedChunks", "status");
  if (!data || !data[0]) return null;
  return {
    totalChunks: Number(data[0]) || 0,
    completedChunks: Number(data[1]) || 0,
    failedChunks: Number(data[2]) || 0,
    status: data[3] || "unknown",
  };
}

/**
 * Atomically updates progress AND checks if finalization should trigger.
 * Single Redis round trip instead of 3 (update + get + check).
 *
 * @param {string} searchKey
 * @param {number} totalChunks - Total expected chunks for this search
 * @param {number} completedInc - Chunks completed in this call (default: 1)
 * @param {number} failedInc - Chunks failed in this call (default: 0)
 * @returns {boolean} True if THIS caller should trigger finalization
 */
async function updateProgressAndCheckFinalize(searchKey, totalChunks, completedInc = 1, failedInc = 0) {
  const key = `search:registry:${searchKey}`;
  try {
    let result;
    if (updateAndCheckSha) {
      result = await redis.evalsha(
        updateAndCheckSha, 1, key,
        String(totalChunks), String(completedInc), String(failedInc), String(REGISTRY_TTL_SECONDS)
      );
    } else {
      result = await redis.eval(
        UPDATE_AND_CHECK_FINALIZE_SCRIPT, 1, key,
        String(totalChunks), String(completedInc), String(failedInc), String(REGISTRY_TTL_SECONDS)
      );
      try {
        updateAndCheckSha = await redis.script("LOAD", UPDATE_AND_CHECK_FINALIZE_SCRIPT);
      } catch (e) { /* will use EVAL next time */ }
    }
    return result === 1;
  } catch (err) {
    // Fallback: retry with EVAL if EVALSHA cache was flushed
    try {
      const result = await redis.eval(
        UPDATE_AND_CHECK_FINALIZE_SCRIPT, 1, key,
        String(totalChunks), String(completedInc), String(failedInc), String(REGISTRY_TTL_SECONDS)
      );
      return result === 1;
    } catch (retryErr) {
      return false;
    }
  }
}

/**
 * Updates progress and refreshes TTL to prevent premature expiry during long searches.
 * Kept for backward compatibility — prefer updateProgressAndCheckFinalize when possible.
 */
async function updateRegistryProgress(searchKey, completedChunksCount = 1, failedChunksCount = 0) {
  const key = `search:registry:${searchKey}`;
  const multi = redis.multi();
  if (completedChunksCount > 0) multi.hincrby(key, "completedChunks", completedChunksCount);
  if (failedChunksCount > 0) multi.hincrby(key, "failedChunks", failedChunksCount);
  multi.expire(key, REGISTRY_TTL_SECONDS);
  await multi.exec();
}

/**
 * Atomically checks if all chunks are done and marks as finalizing.
 * Uses a Lua script to prevent double-finalization across concurrent workers.
 */
async function tryMarkFinalizing(searchKey, totalChunks) {
  const key = `search:registry:${searchKey}`;
  try {
    let result;
    if (finalizeScriptSha) {
      result = await redis.evalsha(finalizeScriptSha, 1, key, String(totalChunks));
    } else {
      result = await redis.eval(FINALIZE_CHECK_SCRIPT, 1, key, String(totalChunks));
      finalizeScriptSha = await redis.script("LOAD", FINALIZE_CHECK_SCRIPT);
    }
    return result === 1;
  } catch (err) {
    try {
      const result = await redis.eval(FINALIZE_CHECK_SCRIPT, 1, key, String(totalChunks));
      return result === 1;
    } catch (retryErr) {
      return false;
    }
  }
}

async function markRegistryCompleted(searchKey) {
  const key = `search:registry:${searchKey}`;
  await redis.hset(key, "status", "completed");
}

module.exports = {
  createRegistryEntry,
  getRegistryEntry,
  getRegistryProgress,
  updateRegistryProgress,
  updateProgressAndCheckFinalize,
  tryMarkFinalizing,
  markRegistryCompleted,
};
