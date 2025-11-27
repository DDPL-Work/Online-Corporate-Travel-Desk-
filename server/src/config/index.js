const path = require('path');

module.exports = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: parseInt(process.env.PORT, 10) || 5000
  },
  api: {
    version: process.env.API_VERSION || 'v1'
  },
  database: {
    uri: process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    adminUrl: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3001'
  },
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880, // 5MB
    path: process.env.UPLOAD_PATH || './uploads',
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf').split(',')
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },
  session: {
    secret: process.env.SESSION_SECRET
  },
  booking: {
    referencePrefix: process.env.BOOKING_REFERENCE_PREFIX || 'BKTD',
    holdTimeMinutes: parseInt(process.env.BOOKING_HOLD_TIME_MINUTES, 10) || 15
  },
  creditAlert: {
    thresholdPercent: parseInt(process.env.CREDIT_ALERT_THRESHOLD_PERCENT, 10) || 80,
    criticalPercent: parseInt(process.env.CREDIT_CRITICAL_THRESHOLD_PERCENT, 10) || 95
  },
  cronJobs: {
    enabled: process.env.ENABLE_CRON_JOBS === 'true',
    creditAlertSchedule: process.env.CREDIT_ALERT_CRON || '0 */6 * * *',
    bookingReminderSchedule: process.env.BOOKING_REMINDER_CRON || '0 8 * * *'
  },
  logs: {
    level: process.env.LOG_LEVEL || 'info',
    path: process.env.LOG_FILE_PATH || './logs'
  }
};