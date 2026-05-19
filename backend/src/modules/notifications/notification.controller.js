const notificationService = require('./notification.service');
const apiResponse = require('../../utils/apiResponse');

class NotificationController {
  async getNotifications(req, res) {
    const result = await notificationService.getUserNotifications(req.user._id, req.query);
    return apiResponse.paginated(res, result.notifications, result.page, result.limit, result.total);
  }

  async markRead(req, res) {
    await notificationService.markRead(req.params.id, req.user._id);
    return apiResponse.success(res, { message: 'Marked as read' });
  }

  async markAllRead(req, res) {
    await notificationService.markAllRead(req.user._id);
    return apiResponse.success(res, { message: 'All notifications marked as read' });
  }

  async getUnreadCount(req, res) {
    const count = await notificationService.getUnreadCount(req.user._id);
    return apiResponse.success(res, { unreadCount: count });
  }
}

module.exports = new NotificationController();
