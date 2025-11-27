// src/utils/logger.js
const { createLogger, transports, format } = require('winston');
require('winston-daily-rotate-file');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new transports.DailyRotateFile({
      dirname: './logs',
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d'
    })
  ],
});

module.exports = logger;
