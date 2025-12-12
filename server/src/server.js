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

(async () => {
  try {
    await connectDB(config.database.uri, config.database.options);

    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`
===========================================
Corporate Travel Desk – Server Running
Environment: ${config.env}
Port: ${PORT}
API Version: ${config.api.version}
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
