const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('./env');

let redis = null;

/**
 * Create Redis connection with reconnection strategy
 */
const createRedisClient = () => {
  if (redis) return redis;

  redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 200, 5000);
    },
  });

  redis.on('connect', () => {
    logger.info('✅ Redis connected successfully');
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redis.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });

  return redis;
};

/**
 * Get the Redis client instance
 */
const getRedis = () => {
  if (!redis) {
    return createRedisClient();
  }
  return redis;
};

/**
 * Disconnect Redis gracefully
 */
const disconnectRedis = async () => {
  if (redis) {
    try {
      await redis.quit();
      logger.info('Redis disconnected gracefully');
      redis = null;
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error: error.message });
      redis = null;
    }
  }
};

module.exports = { createRedisClient, getRedis, disconnectRedis };
