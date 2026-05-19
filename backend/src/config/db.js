const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./env');

/**
 * Connect to MongoDB with exponential backoff retry.
 * Requires replica set for transaction support (wallet system).
 */
const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  };

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(config.mongo.uri, options);
      logger.info('✅ MongoDB connected successfully', {
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      });

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error', { error: err.message });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      return;
    } catch (error) {
      retries += 1;
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      logger.error(`MongoDB connection failed (attempt ${retries}/${MAX_RETRIES})`, {
        error: error.message,
        nextRetryIn: `${delay}ms`,
      });

      if (retries >= MAX_RETRIES) {
        logger.error('MongoDB max retries reached. Exiting process.');
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

/**
 * Disconnect from MongoDB gracefully
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', { error: error.message });
  }
};

module.exports = { connectDB, disconnectDB };
