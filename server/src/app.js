// server/src/app.js

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");

const config = require("./config");
const routes = require("./routes");
const errorMiddleware = require("./middleware/error.middleware");
const rateLimitMiddleware = require("./middleware/rateLimit.middleware");
const logger = require("./utils/logger");
const cronJobs = require("./jobs");

const app = express();
require("./config/sso.config");
// ------------------------------
// TRUST PROXY (for secure cookies on prod)
// ------------------------------
app.set("trust proxy", 1);
// ------------------------------
// SECURITY HEADERS
// ------------------------------
app.use(
  helmet({
    contentSecurityPolicy: false, // disable CSP to avoid frontend blocking
  })
);

// ------------------------------
// CORS
// ------------------------------
app.use(
  cors({
    origin: [config.frontend.url, config.frontend.adminUrl],
    credentials: true,
  })
);

// ------------------------------
// BODY PARSERS
// ------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(cookieParser());
app.use(compression());



// ------------------------------
// PASSPORT AUTH MIDDLEWARE
// ------------------------------
app.use(passport.initialize());

// ------------------------------
// LOGGER
// ------------------------------
app.use(config.env === "development" ? morgan("dev") : morgan("combined"));

// ------------------------------
// RATE LIMIT
// ------------------------------
app.use("/api", rateLimitMiddleware.limiter);

// ------------------------------
// STATIC FILES
// ------------------------------
app.use("/uploads", express.static("uploads"));

// ------------------------------
// API ROUTES
// ------------------------------
app.use(`/api/${config.api.version}`, routes);

// ------------------------------
// HEALTH CHECK
// ------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", env: config.env });
});

// ------------------------------
// GLOBAL ERROR HANDLER
// ------------------------------
app.use(errorMiddleware);

// ------------------------------
// START CRON JOBS IF ENABLED
// ------------------------------
if (config.cronJobs.enabled) {
  cronJobs.start();
  logger.info("✓ Cron Jobs Started");
}

module.exports = app;
