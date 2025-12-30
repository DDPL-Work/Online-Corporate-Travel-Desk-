// server/src/config/index.js

module.exports = {
  env: process.env.NODE_ENV || "development",

  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
  },

  api: {
    version: process.env.API_VERSION || "v1",
  },

  database: {
    uri: process.env.MONGODB_URI,
    options: {
      dbName: process.env.MONGO_DB_NAME,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || "30d",
  },

   frontend: {
    url: process.env.FRONTEND_URL || "https://cotd-lyart-kappa.vercel.app",
    adminUrl: process.env.ADMIN_FRONTEND_URL || "https://cotd-lyart-kappa.vercel.app",
  },

  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880,
    path: process.env.UPLOAD_PATH || "./uploads",
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,application/pdf").split(",")
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  session: {
    secret: process.env.SESSION_SECRET || "default_secret_key",
  },

  cronJobs: {
    enabled: process.env.ENABLE_CRON_JOBS === "true",
    creditAlertSchedule: process.env.CREDIT_ALERT_CRON || "0 */6 * * *",
    bookingReminderSchedule: process.env.BOOKING_REMINDER_CRON || "0 8 * * *",
  }
};
