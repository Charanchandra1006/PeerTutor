const adminService = require('./admin.service');
const apiResponse = require('../../utils/apiResponse');

class AdminController {
  /**
   * GET /api/v1/admin/stats
   */
  async getStats(req, res) {
    const stats = await adminService.getStats();
    return apiResponse.success(res, stats);
  }

  /**
   * GET /api/v1/admin/users
   */
  async getUsers(req, res) {
    const result = await adminService.getUsers(req.query);
    return apiResponse.paginated(res, result.users, result.page, result.limit, result.total);
  }

  /**
   * PATCH /api/v1/admin/users/:id/status
   */
  async updateUserStatus(req, res) {
    const user = await adminService.updateUserStatus(
      req.params.id,
      req.body.is_active,
      req.user._id,
      req.ip
    );
    return apiResponse.success(res, user);
  }

  /**
   * POST /api/v1/admin/users/:id/topup
   */
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

  /**
   * GET /api/v1/admin/transactions
   */
  async getTransactions(req, res) {
    const result = await adminService.getTransactions(req.query);
    return apiResponse.paginated(res, result.transactions, result.page, result.limit, result.total);
  }

  /**
   * GET /api/v1/admin/sessions
   */
  async getSessions(req, res) {
    const result = await adminService.getSessions(req.query);
    return apiResponse.paginated(res, result.sessions, result.page, result.limit, result.total);
  }

  /**
   * POST /api/v1/admin/subjects
   */
  async createSubject(req, res) {
    const subject = await adminService.createSubject(req.body, req.user._id, req.ip);
    return apiResponse.created(res, subject);
  }

  /**
   * GET /api/v1/admin/audit-logs
   */
  async getAuditLogs(req, res) {
    const result = await adminService.getAuditLogs(req.query);
    return apiResponse.paginated(res, result.logs, result.page, result.limit, result.total);
  }
}

module.exports = new AdminController();
