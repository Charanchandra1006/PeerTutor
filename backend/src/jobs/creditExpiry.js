const { Queue } = require('bullmq');
const logger = require('../utils/logger');

/**
 * Credit Expiry Cron Job
 * Runs daily to expire unused credits (per CREDITS_EXPIRY_DAYS config).
 * Uses BullMQ repeatable job.
 */
async function setupCreditExpiryJob() {
  try {
    const config = require('../config/env');
    const url = new URL(config.redis.url);
    const connection = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
    };

    const creditExpiryQueue = new Queue('credit-expiry', { connection });

    // Remove any existing repeatable jobs to avoid duplicates
    const existingJobs = await creditExpiryQueue.getRepeatableJobs();
    for (const job of existingJobs) {
      await creditExpiryQueue.removeRepeatableByKey(job.key);
    }

    // Add daily repeatable job (runs at 2:00 AM)
    await creditExpiryQueue.add(
      'expire-credits',
      {},
      {
        repeat: { pattern: '0 2 * * *' }, // Cron: daily at 2 AM
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );

    logger.info('Credit expiry cron job scheduled (daily at 2:00 AM)');
    return creditExpiryQueue;
  } catch (err) {
    logger.error('Failed to setup credit expiry job', { error: err.message });
  }
}

module.exports = { setupCreditExpiryJob };
