require("dotenv").config();
const { connectDB } = require("./config/database");
const config = require("./config");
const logger = require("./utils/logger");

// Import the worker processor
const searchWorker = require("./workers/searchChunk.worker");

(async () => {
  try {
    // Connect to DB (Required for fetching static hotel details)
    await connectDB(config.database.uri, config.database.options);
    
    logger.info(`
===========================================
Corporate Travel Desk – BullMQ Worker Running 🚀
Environment: ${config.env}
===========================================
`);

    // Handle unhandled rejections
    process.on("unhandledRejection", (err) => {
      logger.error("UNHANDLED PROMISE REJECTION in Worker:", err);
      // Optional: don't exit in production worker immediately, maybe alert
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Shutting down worker...');
      await searchWorker.close();
      process.exit(0);
    });

  } catch (err) {
    logger.error("❌ Worker initialization failed:", err);
    process.exit(1);
  }
})();
