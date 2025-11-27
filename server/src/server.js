// src/server.js
require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB();
    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} (env: ${process.env.NODE_ENV})`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
})();
