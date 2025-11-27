/************************************
 * LOAD ENV EARLY
 ************************************/
require("dotenv").config();

/************************************
 * IMPORTS
 ************************************/
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");

const config = require("./config");
const routes = require("./routes/index.js");
const { errorMiddleware } = require("./middleware/error.middleware.js");
const rateLimitMiddleware = require("./middleware/rateLimit.middleware.js");
const logger = require("./utils/logger.js");
const cronJobs = require("./jobs");
const { connectDB } = require("./config/database.js");
const seedSuperAdmin = require("./config/seedSuperAdmin.js");

const app = express();

/************************************
 *  CONNECT TO DATABASE
 ************************************/
if (!config.database.uri) {
  logger.error("❌ MongoDB URI missing from config");
  process.exit(1);
}

connectDB(config.database.uri, config.database.options)
  .then(async () => {
    logger.info("✅ MongoDB Ready");
    await seedSuperAdmin();
  })
  .catch((err) => {
    logger.error("❌ Fatal MongoDB Error:", err);
    process.exit(1);
  });

/************************************
 * TRUST PROXY
 ************************************/
app.set("trust proxy", 1);

/************************************
 * SECURITY: HELMET
 ************************************/
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

/************************************
 * SECURITY: CORS
 ************************************/
app.use(
  cors({
    origin: [config.frontend.url, config.frontend.adminUrl],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/************************************
 * BODY PARSERS (Must be BEFORE sanitizer)
 ************************************/
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/************************************
 * CUSTOM SAFE SANITIZER
 * (Does NOT reassign req.query, so NO ERRORS)
 ************************************/
function safeSanitize(req, res, next) {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return;

    for (const key in obj) {
      // Remove dangerous keys
      if (key.startsWith("$")) delete obj[key];

      // Replace key dots (Mongo path injection)
      if (key.includes(".")) {
        const newKey = key.replace(/\./g, "_");
        obj[newKey] = obj[key];
        delete obj[key];
      }

      if (typeof obj[key] === "object") sanitize(obj[key]);
    }
  };

  try {
    sanitize(req.body);
    sanitize(req.params);
    sanitize(req.query); // SAFE - only mutates
  } catch (err) {
    console.warn("Sanitize error:", err.message);
  }

  next();
}

app.use(safeSanitize);

/************************************
 * COMPRESSION
 ************************************/
app.use(compression());

/************************************
 * SESSION
 ************************************/
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.env === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

/************************************
 * PASSPORT
 ************************************/
app.use(passport.initialize());
app.use(passport.session());

/************************************
 * LOGGING
 ************************************/
if (config.env === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

/************************************
 * RATE LIMITING
 ************************************/
app.use("/api", rateLimitMiddleware.apiLimiter);

/************************************
 * STATIC FILES
 ************************************/
app.use("/uploads", express.static("uploads"));

/************************************
 * API ROUTES
 ************************************/
app.use(`/api/${config.api.version}`, routes);

/************************************
 * HEALTH CHECK
 ************************************/
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

/************************************
 * ROOT ROUTE
 ************************************/
app.get("/", (req, res) => {
  res.json({
    message: "Corporate Travel Desk API",
    version: config.api.version,
    documentation: "/api-docs",
  });
});

/************************************
 * 404 HANDLER
 ************************************/
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/************************************
 * ERROR HANDLER (LAST)
 ************************************/
app.use(errorMiddleware);

/************************************
 * START CRON JOBS
 ************************************/
if (config.cronJobs.enabled) {
  cronJobs.start();
  logger.info("✓ Cron Jobs Started");
}

/************************************
 * GRACEFUL SHUTDOWN
 ************************************/
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing server");
  mongoose.connection.close(false, () => {
    logger.info("MongoDB connection closed");
    process.exit(0);
  });
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
  process.exit(1);
});

/************************************
 * START SERVER
 ************************************/
const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`
    🚀 Server running successfully
    📍 Mode: ${config.env}
    🔎 Version: ${config.api.version}
    🌐 Port: ${PORT}
    📅 Started: ${new Date().toLocaleString()}
  `);
});

module.exports = app;
