// server/src/app.js

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");

const config = require("./config");
const routes = require("./routes");
const errorMiddleware = require("./middleware/error.middleware");
const rateLimitMiddleware = require("./middleware/rateLimit.middleware");
const logger = require("./utils/logger");
const { getRedisHealth } = require("./services/redisHealth.service");
const { getBullConnectionStatus } = require("./queues/connection");
// const cronJobs = require("./jobs");

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
const allowedOrigins = [
  config.frontend.url,
  config.frontend.superAdminUrl,
  config.frontend.adminUrl,
  config.frontend.prodUrl,
].filter(Boolean); // removes undefined

app.use(
  cors({
    origin: (origin, callback) => {
      // allow Postman / server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ------------------------------
// BODY PARSERS
// ------------------------------
const captureRawBody = (req, res, buffer) => {
  if (buffer?.length) {
    req.rawBody = buffer.toString("utf8");
  }
};

app.use(express.json({ limit: "10mb", verify: captureRawBody }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
    verify: captureRawBody,
  }),
);
app.use((req, res, next) => {
  ["body", "params", "headers", "query"].forEach((key) => {
    if (req[key] && typeof req[key] === "object") {
      mongoSanitize.sanitize(req[key]);
    }
  });

  next();
});

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
app.get("/health", async (req, res) => {
  try {
    const redisHealth = getRedisHealth();
    const searchMetrics = require("./modules/searchCoordinator/metrics.service");
    const { getBullConnectionStatus } = require("./queues/connection");
    const { getSchedulerState } = require("./modules/searchCoordinator/dispatcher.service");
    const mongoose = require("mongoose");

    // MongoDB status
    const mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    // Socket.IO status
    const io = require("./sockets/search.socket").getIO();
    const socketStatus = io ? "connected" : "disconnected";
    const socketConnections = io ? io.engine.clientsCount : 0;

    // Dispatcher status
    const dispatcherState = getSchedulerState();

    // BullMQ status
    const bullConns = getBullConnectionStatus();

    // Queue depths
    const { searchQueue, finalizeQueue, cleanupQueue } = require("./queues/search.queue");
    const [searchWaiting, searchActive, finalizeWaiting, finalizeActive] = await Promise.all([
      searchQueue.getWaitingCount().catch(() => 0),
      searchQueue.getActiveCount().catch(() => 0),
      finalizeQueue.getWaitingCount().catch(() => 0),
      finalizeQueue.getActiveCount().catch(() => 0),
    ]);

    // Memory
    const mem = process.memoryUsage();

    // Event loop lag
    const searchSnap = searchMetrics.getMetricsSnapshot();

    const statusCode = redisHealth.status === "healthy" && mongoStatus === "connected" ? 200 : 503;

    res.status(statusCode).json({
      status: statusCode === 200 ? "OK" : "DEGRADED",
      env: config.env,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),

      // Subsystem status
      redis: {
        status: redisHealth.status,
        connections: redisHealth.connections,
      },
      mongodb: {
        status: mongoStatus,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      },
      socketio: {
        status: socketStatus,
        connections: socketConnections,
      },

      // BullMQ
      bullmq: {
        connections: bullConns,
        queues: {
          search: { waiting: searchWaiting, active: searchActive },
          finalize: { waiting: finalizeWaiting, active: finalizeActive },
        },
      },

      // Dispatcher
      dispatcher: dispatcherState,

      // Search metrics
      search: searchSnap,

      // Memory
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
      },

      // Event loop
      eventLoop: searchSnap.eventLoop,
    });
  } catch (err) {
    logger.error("[Health] Error:", err.message);
    res.status(503).json({ status: "ERROR", env: config.env, error: "Health check failed" });
  }
});

// ------------------------------
// PROMETHEUS METRICS ENDPOINT
// ------------------------------
app.get("/metrics", async (req, res) => {
  try {
    const searchMetrics = require("./modules/searchCoordinator/metrics.service");
    const { getRedisMetrics } = require("./services/redisHealth.service");
    const { getSchedulerState } = require("./modules/searchCoordinator/dispatcher.service");
    const { getBullConnectionStatus } = require("./queues/connection");
    const { searchQueue, finalizeQueue } = require("./queues/search.queue");

    const body = searchMetrics.getPrometheusMetrics();
    const queueState = getSchedulerState();

    let metrics = body;

    // Dispatcher metrics
    metrics += `\n# HELP dispatcher_batch_size Current dispatcher batch size\ndispatcher_batch_size ${queueState.batchSize}\n`;
    metrics += `# HELP dispatcher_tick_ms Current dispatcher tick interval\ndispatcher_tick_ms ${queueState.tickMs}\n`;
    metrics += `# HELP dispatcher_high_latency_ticks Consecutive high latency ticks\ndispatcher_high_latency_ticks ${queueState.highLatencyTicks}\n`;
    metrics += `# HELP dispatcher_active_searches Active searches\ndispatcher_active_searches ${queueState.activeSearchCount}\n`;

    // Application Redis metrics
    const redisMetrics = getRedisMetrics();
    for (const [name, data] of Object.entries(redisMetrics)) {
      metrics += `# HELP redis_${name}_connects Redis ${name} connect count\nredis_${name}_connects ${data.connectCount}\n`;
      metrics += `# HELP redis_${name}_reconnects Redis ${name} reconnect count\nredis_${name}_reconnects ${data.reconnectCount}\n`;
      metrics += `# HELP redis_${name}_errors Redis ${name} error count\nredis_${name}_errors ${data.errorCount}\n`;
    }

    // BullMQ connection metrics (Phase 3 + 11)
    const bullConns = getBullConnectionStatus();
    metrics += `# HELP bullmq_connections_total Total BullMQ Redis connections\nbullmq_connections_total ${bullConns.length}\n`;
    for (const conn of bullConns) {
      const safeLabel = (conn.label || "unknown").replace(/[^a-zA-Z0-9_]/g, "_");
      metrics += `# HELP bullmq_conn_${safeLabel}_ready Connection ready (1=yes)\nbullmq_conn_${safeLabel}_ready ${conn.status === "ready" ? 1 : 0}\n`;
      metrics += `# HELP bullmq_conn_${safeLabel}_errors Connection error count\nbullmq_conn_${safeLabel}_errors ${conn.errorCount}\n`;
      metrics += `# HELP bullmq_conn_${safeLabel}_reconnects Connection reconnect count\nbullmq_conn_${safeLabel}_reconnects ${conn.reconnectCount}\n`;
      metrics += `# HELP bullmq_conn_${safeLabel}_age_ms Connection age in ms\nbullmq_conn_${safeLabel}_age_ms ${conn.ageMs}\n`;
    }

    // Queue depth metrics (Phase 11)
    const [searchWaiting, searchActive, finalizeWaiting, finalizeActive] = await Promise.all([
      searchQueue.getWaitingCount().catch(() => 0),
      searchQueue.getActiveCount().catch(() => 0),
      finalizeQueue.getWaitingCount().catch(() => 0),
      finalizeQueue.getActiveCount().catch(() => 0),
    ]);
    metrics += `# HELP bullmq_search_waiting Search queue waiting jobs\nbullmq_search_waiting ${searchWaiting}\n`;
    metrics += `# HELP bullmq_search_active Search queue active jobs\nbullmq_search_active ${searchActive}\n`;
    metrics += `# HELP bullmq_finalize_waiting Finalize queue waiting jobs\nbullmq_finalize_waiting ${finalizeWaiting}\n`;
    metrics += `# HELP bullmq_finalize_active Finalize queue active jobs\nbullmq_finalize_active ${finalizeActive}\n`;

    // Node.js metrics
    const mem = process.memoryUsage();
    metrics += `# HELP node_heap_used_bytes Node.js heap used\nnode_heap_used_bytes ${mem.heapUsed}\n`;
    metrics += `# HELP node_heap_total_bytes Node.js heap total\nnode_heap_total_bytes ${mem.heapTotal}\n`;
    metrics += `# HELP node_rss_bytes Node.js RSS\nnode_rss_bytes ${mem.rss}\n`;
    metrics += `# HELP node_external_bytes Node.js external\nnode_external_bytes ${mem.external}\n`;
    metrics += `# HELP node_uptime_seconds Process uptime\nnode_uptime_seconds ${Math.round(process.uptime())}\n`;

    res.set("Content-Type", "text/plain");
    res.send(metrics);
  } catch (err) {
    logger.error("[Metrics] Error:", err.message);
    res.status(500).send("# Error generating metrics\n");
  }
});

// ------------------------------
// GLOBAL ERROR HANDLER
// ------------------------------
app.use(errorMiddleware);

// ------------------------------
// START CRON JOBS IF ENABLED
// ------------------------------
// if (config.cronJobs.enabled) {
//   cronJobs.start();
//   logger.info("✓ Cron Jobs Started");
// }

module.exports = app;
