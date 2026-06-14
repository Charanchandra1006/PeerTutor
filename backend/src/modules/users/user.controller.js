const userService = require('./user.service');
const apiResponse = require('../../utils/apiResponse');

class UserController {
  async getProfile(req, res) {
    const user = await userService.getById(req.user._id);
    return apiResponse.success(res, user);
  }

  async updateProfile(req, res) {
    const user = await userService.updateProfile(req.user._id, req.body);
    return apiResponse.success(res, user);
  }

  async listUsers(req, res) {
    const { users, total, page, limit } = await userService.listUsers(req.query);
    return apiResponse.paginated(res, users, page, limit, total);
  }

  async getLeaderboard(req, res) {
    const limit = parseInt(req.query.limit, 10) || 20;
    const students = await userService.getLeaderboard(limit);
    return apiResponse.success(res, students);
  }

  async toggleSaveTutor(req, res) {
    const result = await userService.toggleSaveTutor(req.user._id, req.params.tutorId);
    return apiResponse.success(res, result);
  }

  async getSavedTutors(req, res) {
    const tutors = await userService.getSavedTutors(req.user._id);
    return apiResponse.success(res, tutors);
  }

  async addRecentView(req, res) {
    await userService.addRecentView(req.user._id, req.params.tutorId);
    return apiResponse.success(res, { message: 'Recorded' });
  }

  async getRecentlyViewed(req, res) {
    const tutors = await userService.getRecentlyViewed(req.user._id);
    return apiResponse.success(res, tutors);
  }
}

module.exports = new UserController();
