const { User } = require('../auth/auth.model');
const { TutorProfile, Subject } = require('../tutors/tutor.model');
const { Session } = require('../bookings/booking.model');
const { Transaction } = require('../wallet/wallet.model');
const { AuditLog } = require('../notifications/notification.model');
const walletService = require('../wallet/wallet.service');
const { AppError } = require('../../middleware/errorHandler');
const errorCodes = require('../../utils/errorCodes');
const logger = require('../../utils/logger');

class AdminService {
  /**
   * Get platform dashboard stats
   */
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalTutors,
      totalStudents,
      totalSessions,
      completedSessions,
      totalTransactions,
      activeUsers,
      todaySessions,
      pendingSessions,
    ] = await Promise.all([
      User.countDocuments(),
      TutorProfile.countDocuments(),
      User.countDocuments({ role: { $in: ['student', 'both'] } }),
      Session.countDocuments(),
      Session.countDocuments({ status: 'completed' }),
      Transaction.countDocuments(),
      User.countDocuments({ is_active: true }),
      Session.countDocuments({ created_at: { $gte: today } }),
      Session.countDocuments({ status: 'pending' }),
    ]);

    // Revenue stats
    const revenueAgg = await Transaction.aggregate([
      { $match: { type: 'platform_fee' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return {
      totalUsers,
      totalTutors,
      totalStudents,
      totalSessions,
      completedSessions,
      totalTransactions,
      activeUsers,
      todaySessions,
      pendingSessions,
      totalRevenue: revenueAgg[0]?.total || 0,
    };
  }

  /**
   * Get all users (paginated, filterable)
   */
  async getUsers({ page = 1, limit = 20, role, search, is_active }) {
    const filter = {};
    if (role) filter.role = role;
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (search) {
      const { escapeRegex } = require('../../utils/sanitize');
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).select('-password_hash').sort({ created_at: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return { users, total, page, limit };
  }

  /**
   * Update user status (activate/suspend)
   */
  async updateUserStatus(userId, is_active, adminId, ip) {
    const user = await User.findById(userId).select('-password_hash');
    if (!user) {
      throw new AppError(errorCodes.ADMIN_USER_NOT_FOUND, 'User not found', 404);
    }

    user.is_active = is_active;
    await user.save();

    // Create audit log
    await AuditLog.create({
      admin_id: adminId,
      action: is_active ? 'user_activated' : 'user_suspended',
      target_type: 'user',
      target_id: userId,
      payload: { is_active },
      ip_address: ip,
    });

    logger.info('User status updated by admin', { userId, is_active, adminId });
    return user;
  }

  /**
   * Top-up credits for a user
   */
  async topUpCredits(userId, amount, reason, adminId, ip) {
    const wallet = await walletService.adminTopUp(userId, amount, adminId, reason);

    // Create audit log
    await AuditLog.create({
      admin_id: adminId,
      action: 'credit_topup',
      target_type: 'wallet',
      target_id: userId,
      payload: { amount, reason },
      ip_address: ip,
    });

    return wallet;
  }

  /**
   * Get all transactions (paginated, filterable)
   */
  async getTransactions({ page = 1, limit = 50, type, user_id }) {
    const filter = {};
    if (type) filter.type = type;
    if (user_id) filter.user_id = user_id;

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('user_id', 'name email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
    ]);

    return { transactions, total, page, limit };
  }

  /**
   * Get all sessions (paginated, filterable)
   */
  async getSessions({ page = 1, limit = 20, status }) {
    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .populate('student_id', 'name email')
        .populate('subject_id', 'name code')
        .populate({
          path: 'tutor_id',
          populate: { path: 'user_id', select: 'name email' },
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Session.countDocuments(filter),
    ]);

    return { sessions, total, page, limit };
  }

  /**
   * Manage subjects (create/update/delete)
   */
  async createSubject({ name, code, department }, adminId, ip) {
    const existing = await Subject.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      throw new AppError(errorCodes.SUBJECT_ALREADY_EXISTS, 'Subject with this name or code already exists', 409);
    }

    const subject = await Subject.create({ name, code, department });

    await AuditLog.create({
      admin_id: adminId,
      action: 'subject_created',
      target_type: 'subject',
      target_id: subject._id,
      payload: { name, code, department },
      ip_address: ip,
    });

    return subject;
  }

  /**
   * Get audit logs
   */
  async getAuditLogs({ page = 1, limit = 50 }) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('admin_id', 'name email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(),
    ]);

    return { logs, total, page, limit };
  }

  /**
   * Export transactions as CSV string
   */
  async exportTransactions({ type, user_id, from_date, to_date } = {}) {
    const filter = {};
    if (type) filter.type = type;
    if (user_id) filter.user_id = user_id;
    if (from_date || to_date) {
      filter.created_at = {};
      if (from_date) filter.created_at.$gte = new Date(from_date);
      if (to_date) filter.created_at.$lte = new Date(to_date);
    }

    const transactions = await Transaction.find(filter)
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .limit(10000); // Cap at 10k rows

    // Build CSV
    const header = 'Date,User Name,User Email,Type,Amount,Balance After,Description\n';
    const rows = transactions.map(t => {
      const date = t.created_at ? new Date(t.created_at).toISOString() : '';
      const name = (t.user_id?.name || '').replace(/,/g, ' ');
      const email = t.user_id?.email || '';
      return `${date},${name},${email},${t.type},${t.amount},${t.balance_after},"${(t.description || '').replace(/"/g, '""')}"`;
    });

    return header + rows.join('\n');
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    const mongoose = require('mongoose');
    const os = require('os');

    // DB status
    let dbStatus = 'disconnected';
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        dbStatus = 'connected';
      }
    } catch { dbStatus = 'error'; }

    // Redis status
    let redisStatus = 'disconnected';
    try {
      const { getRedis } = require('../../config/redis');
      const redis = getRedis();
      await redis.ping();
      redisStatus = 'connected';
    } catch { redisStatus = 'error'; }

    // AI Engine status
    let aiStatus = 'unknown';
    try {
      const axios = require('axios');
      const config = require('../../config/env');
      const resp = await axios.get(`${config.ai.engineUrl}/health`, { timeout: 3000 });
      aiStatus = resp.data?.status === 'healthy' ? 'healthy' : 'degraded';
    } catch { aiStatus = 'unreachable'; }

    return {
      status: dbStatus === 'connected' && redisStatus === 'connected' ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(os.totalmem() / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024),
      },
      services: {
        database: dbStatus,
        redis: redisStatus,
        aiEngine: aiStatus,
      },
      system: {
        platform: os.platform(),
        cpus: os.cpus().length,
        loadAvg: os.loadavg(),
        nodeVersion: process.version,
      },
    };
  }

  /**
   * Broadcast announcement to users
   * audience: 'all' | 'students' | 'tutors' | specific branch string
   */
  async broadcastAnnouncement({ audience, title, message }, adminId, ip) {
    const notificationService = require('../notifications/notification.service');

    // Build user filter based on audience
    const filter = { is_active: true };
    if (audience === 'students') {
      filter.role = { $in: ['student', 'both'] };
    } else if (audience === 'tutors') {
      filter.role = { $in: ['tutor', 'both'] };
    } else if (audience !== 'all') {
      // Treat as branch name
      filter.branch = audience;
    }

    const users = await User.find(filter).select('_id');
    const userIds = users.map(u => u._id);

    if (userIds.length > 0) {
      await notificationService.broadcast({
        user_ids: userIds,
        type: 'admin_broadcast',
        title,
        message,
      });
    }

    // Audit log
    await AuditLog.create({
      admin_id: adminId,
      action: 'broadcast_sent',
      target_type: 'system',
      target_id: adminId,
      payload: { audience, title, recipientCount: userIds.length },
      ip_address: ip,
    });

    logger.info('Admin broadcast sent', { audience, recipientCount: userIds.length });
    return { recipientCount: userIds.length };
  }
}

module.exports = new AdminService();
