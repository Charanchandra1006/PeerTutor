const mongoose = require('mongoose');

/**
 * Session Schema
 * Collection: sessions
 * Supports both 1-on-1 and group sessions (up to 8 students)
 */
const sessionSchema = new mongoose.Schema(
  {
    tutor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TutorProfile',
      required: true,
      index: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // For group sessions — additional students
    group_students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    is_group_session: {
      type: Boolean,
      default: false,
    },
    max_participants: {
      type: Number,
      default: 1,
      max: 8,
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    scheduled_at: {
      type: Date,
      required: true,
      index: true,
    },
    duration_minutes: {
      type: Number,
      required: true,
      enum: [30, 60, 90],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed'],
      default: 'pending',
      index: true,
    },
    video_link: {
      type: String,
    },
    credits_reserved: {
      type: Number,
      required: true,
      min: 0,
    },
    credits_released: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String, // Rich text (HTML/JSON from TipTap)
    },
    ai_summary: {
      key_concepts: [String],
      action_items: [String],
      difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    },
    resources: [{
      name: String,
      url: String,
      uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: { type: String, enum: ['pdf', 'image', 'document', 'link'] },
    }],
    calendly_event_id: {
      type: String,
      index: true,
    },
    cancelled_at: Date,
    cancellation_reason: {
      type: String,
      maxlength: 200,
    },
    help_description: {
      type: String,
      maxlength: 500,
    },
    // Chat messages for this session
    chat_messages: [{
      sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      message: String,
      file_url: String,
      sent_at: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound indexes
sessionSchema.index({ tutor_id: 1, status: 1, scheduled_at: 1 });
sessionSchema.index({ student_id: 1, status: 1 });
sessionSchema.index({ scheduled_at: 1 }); // For reminder queries

const Session = mongoose.model('Session', sessionSchema);

module.exports = { Session };
