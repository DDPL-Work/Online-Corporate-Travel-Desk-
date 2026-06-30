const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { getConnections } = require("../config/redisConnections");
const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

let io;
const redis = getConnections().socket;

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6,
    perMessageDeflate: {
      threshold: 1024,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  const connections = getConnections();
  const pubClient = connections.socket;
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
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

    socket.on("join_search", async (searchId) => {
      socket.join(searchId);
      logger.debug(`[Socket.IO] Client ${socket.id} joined ${searchId}`);
      
      try {
        const coordinatorRedis = getConnections().coordinator;
        const status = await coordinatorRedis.hget(`search:registry:${searchId}`, "status");
        if (status === "completed") {
          // Prevent infinite loading if search finished before socket connection
          socket.emit("search_complete", { searchId });
        }
      } catch (err) {
        logger.warn(`[Socket.IO] Error checking search status on join: ${err.message}`);
      }
    });

    socket.on("leave_search", (searchId) => {
      socket.leave(searchId);
      logger.debug(`[Socket.IO] Client ${socket.id} left ${searchId}`);
    });

    /**
     * Search cancellation — frees Redis, workers, and TBO API calls.
     * When a user closes the browser or navigates away, the client emits this
     * so we can stop processing abandoned searches immediately.
     */
    socket.on("cancel_search", async (searchId) => {
      logger.info(`[Socket.IO] Client ${socket.id} cancelled search ${searchId}`);
      try {
        // 1. Remove from active searches set (dispatcher won't dispatch more chunks)
        const coordinatorRedis = getConnections().coordinator;
        await coordinatorRedis.srem("active:searches", searchId);

        // 2. Delete all pending chunks from the list
        await coordinatorRedis.del(`pending:chunks:${searchId}`);

        // 3. Mark as cancelled in registry (workers check this before TBO call)
        await coordinatorRedis.hset(
          `search:registry:${searchId}`,
          "status",
          "cancelled"
        );

        // 4. Leave the room
        socket.leave(searchId);
      } catch (err) {
        logger.warn(`[Socket.IO] Cancel search error: ${err.message}`);
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
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
