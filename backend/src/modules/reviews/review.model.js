const mongoose = require('mongoose');

/**
 * Review Schema
 * Collection: reviews
 * One review per session per reviewer (unique index on session_id + reviewer_id)
 */
const reviewSchema = new mongoose.Schema(
  {
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    reviewer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewer_role: {
      type: String,
      enum: ['student', 'tutor'],
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    is_approved: {
      type: Boolean,
      default: true, // Auto-approve for now; can be moderated
    },
    mod_note: {
      type: String,
      maxlength: 200,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  }
);

// Unique compound index — one review per reviewer per session
reviewSchema.index({ session_id: 1, reviewer_id: 1 }, { unique: true });
reviewSchema.index({ reviewee_id: 1, is_approved: 1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = { Review };
