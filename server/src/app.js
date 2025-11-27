require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');

const config = require('./config');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');
const rateLimitMiddleware = require('./middlewares/rateLimit.middleware');
const logger = require('./utils/logger');
const cronJobs = require('./jobs');

const app = express();

// Database Connection
mongoose.connect(config.database.uri, config.database.options)
  .then(() => {
    logger.info('✓ MongoDB Connected Successfully');
  })
  .catch(err => {
    logger.error('✗ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: [config.frontend.url, config.frontend.adminUrl],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(mongoSanitize());
app.use(compression());

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session Configuration
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.env === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());
require('./config/sso.config');

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Rate Limiting
app.use('/api', rateLimitMiddleware);

// Static Files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use(`/api/${config.api.version}`, routes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'Corporate Travel Desk API',
    version: config.api.version,
    documentation: '/api-docs'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error Handling Middleware (must be last)
app.use(errorMiddleware);

// Start Cron Jobs
if (config.cronJobs.enabled) {
  cronJobs.start();
  logger.info('✓ Cron Jobs Started');
}

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close(false, () => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  logger.info(`
    ╔══════════════════════════════════════════════╗
    ║  🚀 Server running successfully              ║
    ║  📍 Mode: ${config.env.padEnd(32)} ║
    ║  🌐 Port: ${PORT.toString().padEnd(32)} ║
    ║  📅 Started: ${new Date().toLocaleString().padEnd(26)} ║
    ╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;