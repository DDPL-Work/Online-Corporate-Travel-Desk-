const mongoose = require("mongoose");
const logger = require("../utils/logger");

mongoose.set("strictQuery", true);

// Enable debug logging only in development
if (process.env.NODE_ENV === 'production') {
  mongoose.set("debug", (collection, method, query, doc) => {
    logger.debug(`[${collection}.${method}]`, JSON.stringify(query), doc || "");
  });
}

// Global Mongoose connection settings
const DEFAULT_OPTIONS = {
  maxPoolSize: 20,
  minPoolSize: 5,
  autoIndex: false,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 8000,
  family: 4, // IPv4 force (faster failover)
};

/**
 * Attempts to connect to MongoDB with retries
 */
const connectDB = async (uri, options = {}) => {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  let attempt = 1;
  const maxRetries = 5;

  while (attempt <= maxRetries) {
    try {
      logger.info(`MongoDB Connection Attempt ${attempt}/${maxRetries}...`);

      await mongoose.connect(uri, finalOptions);

      logger.info("✅ MongoDB connected successfully");

      bindConnectionEvents();
      return mongoose.connection;

    } catch (err) {
      logger.error(`MongoDB connection failed (Attempt ${attempt}):`, err.message);

      if (attempt === maxRetries) {
        logger.error("❌ Max retries reached. Exiting.");
        process.exit(1);
      }

      await wait(3000 * attempt); // exponential backoff
      attempt++;
    }
  }
};

// Binds Mongoose connection events for monitoring
function bindConnectionEvents() {
  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connection established");
  });

  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected. Attempting reconnect...");
  });

  mongoose.connection.on("reconnectFailed", () => {
    logger.error("MongoDB reconnect failed");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB successfully reconnected");
  });
}

// Simple wait utility
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { connectDB };
