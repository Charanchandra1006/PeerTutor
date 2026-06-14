const adminService = require('./admin.service');
const reviewService = require('../reviews/review.service');
const apiResponse = require('../../utils/apiResponse');

class AdminController {
  async getStats(req, res) {
    const stats = await adminService.getStats();
    return apiResponse.success(res, stats);
  }

  async getUsers(req, res) {
    const { users, total, page, limit } = await adminService.getUsers(req.query);
    return apiResponse.paginated(res, users, page, limit, total);
  }

  async updateUserStatus(req, res) {
    const user = await adminService.updateUserStatus(
      req.params.id,
      req.body.is_active,
      req.user._id,
      req.ip
    );
    return apiResponse.success(res, user);
  }

  async topUpCredits(req, res) {
    const { amount, reason } = req.body;
    const wallet = await adminService.topUpCredits(
      req.params.id,
      amount,
      reason,
      req.user._id,
      req.ip
    );
    return apiResponse.success(res, wallet);
  }

  async getTransactions(req, res) {
    const { transactions, total, page, limit } = await adminService.getTransactions(req.query);
    return apiResponse.paginated(res, transactions, page, limit, total);
  }

  async getSessions(req, res) {
    const { sessions, total, page, limit } = await adminService.getSessions(req.query);
    return apiResponse.paginated(res, sessions, page, limit, total);
  }

  async createSubject(req, res) {
    const subject = await adminService.createSubject(req.body, req.user._id, req.ip);
    return apiResponse.created(res, subject);
  }

  async getAuditLogs(req, res) {
    const { logs, total, page, limit } = await adminService.getAuditLogs(req.query);
    return apiResponse.paginated(res, logs, page, limit, total);
  }

  // ── New handlers ──

  async exportTransactions(req, res) {
    const csv = await adminService.exportTransactions(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    return res.send(csv);
  }

  async getSystemHealth(req, res) {
    const health = await adminService.getSystemHealth();
    return apiResponse.success(res, health);
  }

  async broadcastAnnouncement(req, res) {
    const result = await adminService.broadcastAnnouncement(req.body, req.user._id, req.ip);
    return apiResponse.success(res, result, 'Broadcast sent successfully');
  }

  async getModerationQueue(req, res) {
    const { reviews, total, page, limit } = await reviewService.getModerationQueue(req.query);
    return apiResponse.paginated(res, reviews, page, limit, total);
  }

  async moderateReview(req, res) {
    const review = await reviewService.moderateReview(req.params.id, req.body);
    return apiResponse.success(res, review);
  }
}

module.exports = new AdminController();
