require("dotenv").config();
const { connectDB } = require("./config/database");
const config = require("./config");
const logger = require("./utils/logger");
const { closeAll } = require("./config/redisConnections");

const searchWorker = require("./workers/searchChunk.worker");
const { worker: finalizeWorker } = require("./workers/searchFinalize.worker");

(async () => {
  try {
    await connectDB(config.database.uri, config.database.options);

    logger.info(`
===========================================
Corporate Travel Desk – BullMQ Worker Running
Environment: ${config.env}
===========================================
`);

    process.on("unhandledRejection", (err) => {
      logger.error("UNHANDLED PROMISE REJECTION in Worker:", err);
    });

    // ─── Graceful Shutdown ─────────────────────────────────────────────
    let isShuttingDown = false;

    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`${signal} received. Shutting down worker...`);

      // 1. Close BullMQ workers (stops processing, waits for active jobs)
      try {
        await searchWorker.close();
        logger.info("[Shutdown] Search chunk worker closed");
      } catch (err) {
        logger.error("[Shutdown] Error closing search chunk worker:", err);
      }

      try {
        await finalizeWorker.close();
        logger.info("[Shutdown] Finalize worker closed");
      } catch (err) {
        logger.error("[Shutdown] Error closing finalize worker:", err);
      }

      // 2. Close BullMQ Redis connections
      try {
        const { closeBullConnections } = require("./queues/connection");
        await closeBullConnections();
        logger.info("[Shutdown] BullMQ Redis connections closed");
      } catch (err) {
        logger.error("[Shutdown] Error closing BullMQ Redis:", err);
      }

      // 3. Close Application Redis connections
      try {
        await closeAll();
        logger.info("[Shutdown] Application Redis connections closed");
      } catch (err) {
        logger.error("[Shutdown] Error closing application Redis:", err);
      }

      // 4. Close MongoDB
      try {
        const mongoose = require("mongoose");
        await mongoose.connection.close();
        logger.info("[Shutdown] MongoDB connection closed");
      } catch (e) {}

      // 5. Force exit after 10s
      const forceExitTimer = setTimeout(() => {
        logger.error("[Shutdown] Forced worker exit after 10s timeout");
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGUSR2", () => shutdown("SIGUSR2"));

  } catch (err) {
    logger.error("Worker initialization failed:", err);
    process.exit(1);
  }
})();
