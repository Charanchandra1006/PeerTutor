const config = require('./config/env');
const logger = require('./utils/logger');
const { connectDB, disconnectDB } = require('./config/db');
const { createRedisClient, disconnectRedis } = require('./config/redis');
const { httpServer } = require('./app');

const PORT = config.port || 3000;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // 1. Connect to MongoDB (with retry)
    await connectDB();

    // 2. Connect to Redis
    createRedisClient();

    // 3. Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 PTM API Server running on port ${PORT}`, {
        env: config.env,
        port: PORT,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 * Drains connections on SIGTERM/SIGINT before process.exit
 */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Disconnect from databases
      await disconnectDB();
      await disconnectRedis();

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
});

// Start the server
startServer();
