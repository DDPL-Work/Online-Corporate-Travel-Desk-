const mongoose = require("mongoose");
const logger = require("../utils/logger");

mongoose.set("strictQuery", true);

if (process.env.NODE_ENV === "development") {
  mongoose.set("debug", true);
}

const DEFAULT_OPTIONS = {
  maxPoolSize: 20,
  minPoolSize: 5,
  autoIndex: process.env.NODE_ENV === "development",
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

const connectDB = async (uri, options = {}) => {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    logger.info("Connecting to MongoDB...");
    await mongoose.connect(uri, finalOptions);
    logger.info("✅ MongoDB connected successfully");
  } catch (err) {
    logger.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};

module.exports = { connectDB };
