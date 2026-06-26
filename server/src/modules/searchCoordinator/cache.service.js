const { getConnections } = require("../../config/redisConnections");
const redis = getConnections().coordinator;
const zlib = require("zlib");
const { promisify } = require("util");

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

async function getSharedCache(searchKey) {
  const key = `cache:search:${searchKey}`;
  const buffer = await redis.getBuffer(key);
  if (!buffer) return null;
  
  try {
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString('utf-8'));
  } catch (err) {
    return null;
  }
}

async function setSharedCache(searchKey, dataset, ttlSeconds = 1800) {
  const key = `cache:search:${searchKey}`;
  const jsonString = JSON.stringify(dataset);
  const compressed = await gzip(jsonString);
  await redis.set(key, compressed, "EX", ttlSeconds);
}

module.exports = {
  getSharedCache,
  setSharedCache
};
