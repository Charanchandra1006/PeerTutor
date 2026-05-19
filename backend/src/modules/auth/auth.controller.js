const authService = require('./auth.service');
const apiResponse = require('../../utils/apiResponse');
const logger = require('../../utils/logger');

class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  async register(req, res) {
    const result = await authService.register(req.body);
    return apiResponse.created(res, result);
  }

  /**
   * POST /api/v1/auth/verify-otp
   */
  async verifyOTP(req, res) {
    const result = await authService.verifyOTP(req.body);
    return apiResponse.success(res, result);
  }

  /**
   * POST /api/v1/auth/login
   */
  async login(req, res) {
    const result = await authService.login(req.body);
    return apiResponse.success(res, result);
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refreshToken(req, res) {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);
    return apiResponse.success(res, tokens);
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req, res) {
    await authService.logout(req.user._id);
    return apiResponse.success(res, { message: 'Logged out successfully' });
  }

  /**
   * GET /api/v1/auth/me
   */
  async getMe(req, res) {
    const user = await authService.getMe(req.user._id);
    return apiResponse.success(res, user);
  }

  /**
   * PATCH /api/v1/auth/password
   */
  async changePassword(req, res) {
    await authService.changePassword(req.user._id, req.body);
    return apiResponse.success(res, { message: 'Password changed successfully' });
  }

  /**
   * POST /api/v1/auth/resend-otp
   */
  async resendOTP(req, res) {
    const result = await authService.resendOTP(req.body.email);
    return apiResponse.success(res, result);
  }

  /**
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req, res) {
    const result = await authService.forgotPassword(req.body.email);
    return apiResponse.success(res, result);
  }

  /**
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req, res) {
    const result = await authService.resetPassword(req.body);
    return apiResponse.success(res, result);
  }
}

module.exports = new AuthController();
