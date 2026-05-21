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
}

module.exports = new AdminService();
