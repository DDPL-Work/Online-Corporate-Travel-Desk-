// server/src/server.js

require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDB } = require("./config/database");
const config = require("./config");
const logger = require("./utils/logger");
const { closeAll } = require("./config/redisConnections");
const PORT = config.server.port || 5000;

const { initCronJobs } = require("./utils/cronJobs");
const { initSocketIO } = require("./sockets/search.socket");

let server;

(async () => {
  try {
    await connectDB(config.database.uri, config.database.options);

    initCronJobs();

    server = http.createServer(app);

    const io = initSocketIO(server);

    const socketPublisher = require("./modules/searchCoordinator/socketPublisher.service");
    socketPublisher.setIOInstance(io);
    socketPublisher.startPublisherLoop(100);

    const { startQueueSchedulers, startQueueEvents } = require("./queues/search.queue");
    startQueueSchedulers();
    startQueueEvents();

    const dispatcherService = require("./modules/searchCoordinator/dispatcher.service");
    dispatcherService.startDispatcherLoop(100);

    const recoveryService = require("./modules/searchCoordinator/recovery.service");
    recoveryService.startRecoveryLoop(30000);

    const { setIOInstance } = require("./workers/searchFinalize.worker");
    setIOInstance(io);

    // Import workers for graceful shutdown
    const searchWorker = require("./workers/searchChunk.worker");
    const { worker: finalizeWorker } = require("./workers/searchFinalize.worker");

    server.listen(PORT, () => {
      logger.info(`
===========================================
Corporate Travel Desk – Server Running
Environment: ${config.env}
Port: ${PORT}
API Version: ${config.api.version}
===========================================
`);

      // Event Loop Lag Monitoring
      try {
        const { monitorEventLoopDelay } = require("perf_hooks");
        const elHistogram = monitorEventLoopDelay({ resolution: 5000 });
        elHistogram.enable();

        const lagInterval = setInterval(() => {
          const metrics = require("./modules/searchCoordinator/metrics.service");
          metrics.updateEventLoopLag({
            mean: Math.round(elHistogram.mean / 1e6),
            max: Math.round(elHistogram.max / 1e6),
            p99: Math.round(elHistogram.percentile(99) / 1e6),
          });
          elHistogram.reset();
        }, 10000);
        lagInterval.unref();
      } catch (e) {
        logger.warn(`[EventLoop] Monitor not available: ${e.message}`);
      }
    });

    // Handle unhandled rejections — log but do NOT crash
    process.on("unhandledRejection", (err) => {
      logger.error("UNHANDLED PROMISE REJECTION:", err);
    });

    process.on("uncaughtException", (err) => {
      logger.error("UNCAUGHT EXCEPTION:", err);
    });

    // ─── Graceful Shutdown (Phase 5 — Correct Order) ──────────────────
    //
    //  1. HTTP Server         — stop accepting new connections
    //  2. Dispatcher          — stop feeding queues
    //  3. Recovery Loop       — stop recovery checks
    //  4. Socket Publisher    — stop emitting
    //  5. Socket.IO           — close real-time connections
    //  6. BullMQ Workers      — stop processing, finish active jobs
    //  7. QueueEvents         — stop listening for events
    //  8. Queues              — stop accepting new jobs
    //  9. BullMQ Redis        — close dedicated connections
    // 10. Application Redis   — close shared pool
    // 11. MongoDB             — close connections
    // 12. Exit

    let isShuttingDown = false;

    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`${signal} received. Starting graceful shutdown...`);

      // 1. Stop HTTP server
      if (server) {
        server.close(() => {
          logger.info("[Shutdown] HTTP server closed");
        });
      }

      // 2. Stop dispatcher (stops feeding queues)
      try { dispatcherService.stopDispatcherLoop(); } catch (e) {}

      // 3. Stop recovery loop
      try { recoveryService.stopRecoveryLoop(); } catch (e) {}

      // 4. Stop socket publisher
      try { socketPublisher.stopPublisherLoop(); } catch (e) {}

      // 5. Close Socket.IO
      try {
        io.close();
        logger.info("[Shutdown] Socket.IO closed");
      } catch (e) {}

      // 6. Close BullMQ Workers (waits for active jobs to finish)
      try {
        await searchWorker.close();
        logger.info("[Shutdown] Search chunk worker closed");
      } catch (e) {}

      try {
        await finalizeWorker.close();
        logger.info("[Shutdown] Finalize worker closed");
      } catch (e) {}

      // 7-8. Close QueueEvents + Queues
      try {
        const { stopQueues } = require("./queues/search.queue");
        await stopQueues();
        logger.info("[Shutdown] Queues and events closed");
      } catch (e) {}

      // 9. Close BullMQ Redis connections
      try {
        const { closeBullConnections } = require("./queues/connection");
        await closeBullConnections();
        logger.info("[Shutdown] BullMQ Redis connections closed");
      } catch (e) {}

      // 10. Close Application Redis connections
      try {
        await closeAll();
        logger.info("[Shutdown] Application Redis connections closed");
      } catch (e) {}

      // 11. Close MongoDB
      try {
        const mongoose = require("mongoose");
        await mongoose.connection.close();
        logger.info("[Shutdown] MongoDB connection closed");
      } catch (e) {}

      // 12. Force exit after 10s if graceful shutdown hangs
      const forceExitTimer = setTimeout(() => {
        logger.error("[Shutdown] Forced exit after 10s timeout");
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGUSR2", () => shutdown("SIGUSR2"));

  } catch (err) {
    logger.error("Server initialization failed:", err);
    process.exit(1);
  }
})();
