const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const Redis = require("ioredis");
const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

let io;

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST"]
    }
  });

  // Redis Adapter for cross-process event broadcasting
  const pubClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow unauthenticated connections if public search is allowed
      // Otherwise, reject: return next(new Error("Authentication error"));
      return next(); 
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`[Socket.IO] Client connected: ${socket.id}`);

    // Join a specific search session room
    socket.on("join_search", (searchId) => {
      socket.join(searchId);
      logger.info(`[Socket.IO] Client ${socket.id} joined ${searchId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initSocketIO, getIO };
