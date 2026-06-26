/**
 * DEPRECATED: This module is kept for backward compatibility only.
 * 
 * Use getConnections().general from redisConnections.js instead.
 * This file creates no new connections — it reuses the centralized pool.
 */
const { getConnections } = require("./redisConnections");
const redis = getConnections().general;

module.exports = redis;
