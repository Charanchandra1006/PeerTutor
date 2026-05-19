const tutorService = require('./tutor.service');
const apiResponse = require('../../utils/apiResponse');

class TutorController {
  async createProfile(req, res) {
    const profile = await tutorService.createProfile(req.user._id, req.body);
    return apiResponse.created(res, profile);
  }

  async updateProfile(req, res) {
    const profile = await tutorService.updateProfile(req.user._id, req.body);
    return apiResponse.success(res, profile);
  }

  async getMyProfile(req, res) {
    const profile = await tutorService.getByUserId(req.user._id);
    return apiResponse.success(res, profile);
  }

  async getProfile(req, res) {
    const profile = await tutorService.getById(req.params.id);
    return apiResponse.success(res, profile);
  }

  async searchTutors(req, res) {
    const { tutors, total, page, limit } = await tutorService.searchTutors(req.query);
    return apiResponse.paginated(res, tutors, page, limit, total);
  }

  async updateAvailability(req, res) {
    const profile = await tutorService.updateAvailability(req.user._id, req.body.availability);
    return apiResponse.success(res, profile);
  }

  async addPortfolioItem(req, res) {
    const profile = await tutorService.addPortfolioItem(req.user._id, {
      ...req.body,
      file_url: req.file?.path || req.body.file_url,
    });
    return apiResponse.created(res, profile);
  }

  async addResource(req, res) {
    const profile = await tutorService.addResource(req.user._id, {
      ...req.body,
      file_url: req.file?.path || req.body.file_url,
    });
    return apiResponse.created(res, profile);
  }

  async searchResources(req, res) {
    const resources = await tutorService.searchResources(req.query);
    return apiResponse.success(res, resources);
  }

  // ── Subjects ──
  async createSubject(req, res) {
    const subject = await tutorService.createSubject(req.body);
    return apiResponse.created(res, subject);
  }

  async listSubjects(req, res) {
    const subjects = await tutorService.listSubjects(req.query);
    return apiResponse.success(res, subjects);
  }

  async updateSubject(req, res) {
    const subject = await tutorService.updateSubject(req.params.id, req.body);
    return apiResponse.success(res, subject);
  }

  async deleteSubject(req, res) {
    const subject = await tutorService.deleteSubject(req.params.id);
    return apiResponse.success(res, subject);
  }
}

module.exports = new TutorController();
