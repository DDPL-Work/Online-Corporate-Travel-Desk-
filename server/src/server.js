// server/src/server.js

require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDB } = require("./config/database");
const config = require("./config");
const logger = require("./utils/logger");
const PORT = config.server.port || 5000;
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CALLBACK_URL:", process.env.GOOGLE_CALLBACK_URL);

const { initCronJobs } = require("./utils/cronJobs");
const { initSocketIO } = require("./sockets/search.socket");
require("./workers/searchChunk.worker"); // Ensure worker runs in the same process for simplicity

(async () => {
  try {
    await connectDB(config.database.uri, config.database.options);

    // Initialize Cron Jobs
    initCronJobs();

    const server = http.createServer(app);
    
    // Initialize Socket.IO
    const io = initSocketIO(server);

    // Initialize Batched Socket Streaming
    const socketPublisher = require("./modules/searchCoordinator/socketPublisher.service");
    socketPublisher.setIOInstance(io);
    socketPublisher.startPublisherLoop(250); // Emit aggregated chunks every 250ms

    // Initialize Round-Robin Queue Dispatcher
    const dispatcherService = require("./modules/searchCoordinator/dispatcher.service");
    dispatcherService.startDispatcherLoop(100); // Feed BullMQ fairly every 100ms

    // Pass IO to Finalizer Worker
    const { setIOInstance } = require("./workers/searchFinalize.worker");
    setIOInstance(io);

    server.listen(PORT, () => {
      logger.info(`
===========================================
Corporate Travel Desk – Server Running ⛷️
Environment: ${config.env} 🛡️
Port: ${PORT} 🔌
API Version: ${config.api.version} 1️⃣
===========================================
`);
    });

    // Handle unhandled rejections
    process.on("unhandledRejection", (err) => {
      logger.error("UNHANDLED PROMISE REJECTION:", err);
      process.exit(1);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      logger.error("UNCAUGHT EXCEPTION:", err);
      process.exit(1);
    });
  } catch (err) {
    logger.error("❌ Server initialization failed:", err);
    process.exit(1);
  }
})();
