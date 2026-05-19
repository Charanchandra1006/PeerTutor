const { Notification } = require('./notification.model');
const logger = require('../../utils/logger');

class NotificationService {
  /**
   * Create a notification
   */
  async create({ user_id, type, title, message, metadata = {} }) {
    const notification = await Notification.create({
      user_id, type, title, message, metadata,
    });
    logger.info('Notification created', { userId: user_id, type });
    return notification;
  }

  /**
   * Get user notifications (paginated)
   */
  async getUserNotifications(userId, { page = 1, limit = 20, unread_only = false }) {
    const filter = { user_id: userId };
    if (unread_only) filter.is_read = false;

    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user_id: userId, is_read: false }),
    ]);

    return { notifications, total, unreadCount, page, limit };
  }

  /**
   * Mark notification as read
   */
  async markRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user_id: userId },
      { is_read: true },
      { new: true }
    );
  }

  /**
   * Mark all notifications as read
   */
  async markAllRead(userId) {
    await Notification.updateMany(
      { user_id: userId, is_read: false },
      { is_read: true }
    );
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({ user_id: userId, is_read: false });
  }

  /**
   * Broadcast notification to multiple users
   */
  async broadcast({ user_ids, type, title, message, metadata = {} }) {
    const notifications = user_ids.map(user_id => ({
      user_id, type, title, message, metadata,
    }));
    return Notification.insertMany(notifications);
  }
}

module.exports = new NotificationService();
