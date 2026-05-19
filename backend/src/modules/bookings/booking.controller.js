const bookingService = require('./booking.service');
const apiResponse = require('../../utils/apiResponse');

class BookingController {
  async createBooking(req, res) {
    const session = await bookingService.createBooking(req.user._id, req.body);
    return apiResponse.created(res, session);
  }

  async joinGroupSession(req, res) {
    const session = await bookingService.joinGroupSession(req.user._id, req.params.id);
    return apiResponse.success(res, session);
  }

  async getUserBookings(req, res) {
    const { sessions, total, page, limit } = await bookingService.getUserBookings(
      req.user._id,
      req.query
    );
    return apiResponse.paginated(res, sessions, page, limit, total);
  }

  async getById(req, res) {
    const session = await bookingService.getById(req.params.id, req.user._id);
    return apiResponse.success(res, session);
  }

  async cancelBooking(req, res) {
    const result = await bookingService.cancelBooking(
      req.params.id,
      req.user._id,
      req.body.reason
    );
    return apiResponse.success(res, result);
  }

  async completeSession(req, res) {
    const session = await bookingService.completeSession(req.params.id, req.user._id);
    return apiResponse.success(res, session);
  }

  async saveNotes(req, res) {
    const session = await bookingService.saveNotes(req.params.id, req.user._id, req.body.content);
    return apiResponse.success(res, session);
  }

  async getVideoLink(req, res) {
    const link = await bookingService.getVideoLink(req.params.id, req.user._id);
    return apiResponse.success(res, link);
  }
}

module.exports = new BookingController();
