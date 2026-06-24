const redis = require("../../config/redis");

async function createRegistryEntry(searchKey, metadata) {
  const key = `search:registry:${searchKey}`;
  const payload = {
    searchId: searchKey,
    status: 'running',
    createdAt: Date.now(),
    totalChunks: metadata.totalChunks || 0,
    completedChunks: 0,
    failedChunks: 0,
    totalHotelCodes: metadata.totalHotelCodes || 0
  };
  await redis.hset(key, payload);
  await redis.expire(key, 1800); // 30 minutes registry TTL
  return payload;
}

async function getRegistryEntry(searchKey) {
  const key = `search:registry:${searchKey}`;
  const data = await redis.hgetall(key);
  if (!data || Object.keys(data).length === 0) return null;
  return data;
}

async function updateRegistryProgress(searchKey, completedChunksCount = 1, failedChunksCount = 0) {
  const key = `search:registry:${searchKey}`;
  const multi = redis.multi();
  if (completedChunksCount > 0) multi.hincrby(key, "completedChunks", completedChunksCount);
  if (failedChunksCount > 0) multi.hincrby(key, "failedChunks", failedChunksCount);
  await multi.exec();
}

async function markRegistryCompleted(searchKey) {
  const key = `search:registry:${searchKey}`;
  await redis.hset(key, "status", "completed");
}

module.exports = {
  createRegistryEntry,
  getRegistryEntry,
  updateRegistryProgress,
  markRegistryCompleted
};
