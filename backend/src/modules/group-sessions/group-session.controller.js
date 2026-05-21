const groupSessionService = require('./group-session.service');
const apiResponse = require('../../utils/apiResponse');

class GroupSessionController {
  /**
   * POST /api/v1/group-sessions
   */
  async create(req, res) {
    const session = await groupSessionService.createGroupSession(req.user._id, req.body);
    return apiResponse.created(res, session);
  }

  /**
   * GET /api/v1/group-sessions
   */
  async discover(req, res) {
    const result = await groupSessionService.discoverGroupSessions(req.query);
    return apiResponse.paginated(res, result.sessions, result.page, result.limit, result.total);
  }

  /**
   * GET /api/v1/group-sessions/:id
   */
  async getById(req, res) {
    const session = await groupSessionService.getGroupSession(req.params.id);
    return apiResponse.success(res, session);
  }

  /**
   * POST /api/v1/group-sessions/:id/join
   */
  async join(req, res) {
    const session = await groupSessionService.joinGroupSession(req.user._id, req.params.id);
    return apiResponse.success(res, session);
  }

  /**
   * POST /api/v1/group-sessions/:id/leave
   */
  async leave(req, res) {
    const result = await groupSessionService.leaveGroupSession(req.user._id, req.params.id);
    return apiResponse.success(res, result);
  }

  /**
   * POST /api/v1/group-sessions/:id/attendance
   */
  async recordAttendance(req, res) {
    const attendance = await groupSessionService.recordAttendance(
      req.params.id,
      req.user._id,
      req.body.action
    );
    return apiResponse.success(res, attendance);
  }

  /**
   * POST /api/v1/group-sessions/:id/complete
   */
  async complete(req, res) {
    const session = await groupSessionService.completeGroupSession(req.params.id, req.user._id);
    return apiResponse.success(res, session);
  }

  /**
   * POST /api/v1/group-sessions/:id/materials
   */
  async uploadMaterial(req, res) {
    const session = await groupSessionService.uploadMaterial(req.params.id, req.user._id, req.body);
    return apiResponse.success(res, session);
  }

  /**
   * GET /api/v1/group-sessions/:id/participants
   */
  async getParticipants(req, res) {
    const result = await groupSessionService.getParticipants(req.params.id);
    return apiResponse.success(res, result);
  }
}

module.exports = new GroupSessionController();
