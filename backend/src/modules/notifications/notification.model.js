const mongoose = require('mongoose');

/**
 * Notification Schema
 * Collection: notifications
 * TTL: 30 days auto-delete
 */
const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'booking_confirmed', 'session_reminder', 'review_prompt',
      'credit_alert', 'admin_broadcast', 'badge_earned',
      'session_started', 'session_completed', 'credits_received',
      'credits_reserved', 'low_balance', 'account_suspended',
      'tutor_verified', 'general',
    ],
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  is_read: {
    type: Boolean,
    default: false,
    index: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 2592000, // TTL: 30 days (in seconds)
  },
});

// Compound index for unread notifications query
notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

/**
 * Audit Log Schema
 * Collection: audit_logs
 * IMMUTABLE — admin action journal
 */
const auditLogSchema = new mongoose.Schema({
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  target_type: {
    type: String,
    required: true,
    index: true,
  },
  target_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
  },
  ip_address: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Prevent updates/deletes (immutable)
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are immutable');
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = { Notification, AuditLog };
