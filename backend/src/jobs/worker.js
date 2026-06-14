const { Queue, Worker } = require('bullmq');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

// Lazy-initialize connection
let connection = null;
const getConnection = () => {
  if (!connection) {
    const config = require('../config/env');
    const url = new URL(config.redis.url);
    connection = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
    };
  }
  return connection;
};

// ── Queue Definitions ──
const createQueue = (name) => new Queue(name, { connection: getConnection() });

const emailQueue = createQueue('email-queue');
const notificationQueue = createQueue('notification-queue');
const aiQueue = createQueue('ai-queue');
const analyticsQueue = createQueue('analytics-queue');

// ── Email Worker ──
const emailWorker = new Worker(
  'email-queue',
  async (job) => {
    const { to, template, data } = job.data;
    logger.info('Processing email job', { to, template, jobId: job.id });

    try {
      // SendGrid integration
      const config = require('../config/env');
      if (config.sendgrid.apiKey) {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(config.sendgrid.apiKey);
        await sgMail.send({
          to,
          from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
          subject: data.subject || 'PTM Notification',
          html: data.html || `<p>${data.message}</p>`,
        });
        logger.info('Email sent', { to, template });
      } else {
        logger.warn('SendGrid not configured — skipping email', { to, template });
      }
    } catch (error) {
      logger.error('Email send failed', { error: error.message, to });
      throw error;
    }
  },
  { connection: getConnection(), concurrency: 5 }
);

// ── Notification Worker ──
const notifWorker = new Worker(
  'notification-queue',
  async (job) => {
    const { user_id, type, title, message, metadata } = job.data;
    logger.info('Processing notification job', { userId: user_id, type });

    const NotificationService = require('../modules/notifications/notification.service');
    await NotificationService.create({ user_id, type, title, message, metadata });

    // Emit via Socket.io if available
    try {
      const { io } = require('../app');
      if (io) {
        io.to(`user:${user_id}`).emit('notification', { type, title, message, metadata });
      }
    } catch (e) {
      // Socket not available in worker process
    }
  },
  { connection: getConnection(), concurrency: 10 }
);

// ── AI Worker ──
const aiWorker = new Worker(
  'ai-queue',
  async (job) => {
    const { student_id, subject, action } = job.data;
    logger.info('Processing AI job', { action, studentId: student_id });

    if (action === 'recalculate_scores') {
      try {
        const axios = require('axios');
        const config = require('../config/env');
        await axios.post(`${config.ai.engineUrl}/match`, {
          student_id,
          subject,
          top_n: 20,
        });
        logger.info('AI scores recalculated', { student_id, subject });
      } catch (error) {
        logger.error('AI recalculation failed', { error: error.message });
      }
    }
  },
  { connection: getConnection(), concurrency: 3 }
);

// ── Analytics Worker ──
const analyticsWorker = new Worker(
  'analytics-queue',
  async (job) => {
    logger.info('Processing analytics job', { action: job.data.action });
    // Aggregate daily stats
    const { Session } = require('../modules/bookings/booking.model');
    const { Transaction } = require('../modules/wallet/wallet.model');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sessionCount, totalCredits] = await Promise.all([
      Session.countDocuments({
        created_at: { $gte: today },
        status: 'completed',
      }),
      Transaction.aggregate([
        { $match: { created_at: { $gte: today }, type: 'credit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    logger.info('Daily analytics computed', {
      sessions: sessionCount,
      credits: totalCredits[0]?.total || 0,
    });
  },
  { connection: getConnection(), concurrency: 1 }
);

// ── Credit Expiry Worker ──
const creditExpiryQueue = createQueue('credit-expiry');
const creditExpiryWorker = new Worker(
  'credit-expiry',
  async (job) => {
    logger.info('Processing credit expiry job');
    const walletService = require('../modules/wallet/wallet.service');
    const result = await walletService.expireCredits();
    logger.info('Credit expiry completed', result);
  },
  { connection: getConnection(), concurrency: 1 }
);

// Error handlers
[emailWorker, notifWorker, aiWorker, analyticsWorker, creditExpiryWorker].forEach((worker) => {
  worker.on('failed', (job, err) => {
    logger.error(`Worker job failed: ${worker.name}`, {
      jobId: job?.id,
      error: err.message,
    });
  });
});

logger.info('🔄 BullMQ workers started');

// Setup credit expiry repeatable job
const { setupCreditExpiryJob } = require('./creditExpiry');
setupCreditExpiryJob().catch(err => logger.error('Credit expiry setup failed', { error: err.message }));

module.exports = { emailQueue, notificationQueue, aiQueue, analyticsQueue, creditExpiryQueue };
