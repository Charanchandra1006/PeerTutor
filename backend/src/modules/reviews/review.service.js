const { Review } = require('./review.model');
const { Session } = require('../bookings/booking.model');
const { TutorProfile } = require('../tutors/tutor.model');
const { AppError } = require('../../middleware/errorHandler');
const errorCodes = require('../../utils/errorCodes');
const logger = require('../../utils/logger');

class ReviewService {
  /**
   * Submit a post-session review
   */
  async submitReview(userId, { session_id, rating, comment }) {
    // Validate session exists and is completed
    const session = await Session.findById(session_id).populate('tutor_id');
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);
    if (session.status !== 'completed') {
      throw new AppError(errorCodes.REVIEW_SESSION_NOT_COMPLETED, 'Can only review completed sessions', 400);
    }

    // Determine reviewer role and reviewee
    const isStudent = session.student_id.toString() === userId.toString() ||
      (session.group_students && session.group_students.some(s => s.toString() === userId.toString()));
    const isTutor = session.tutor_id.user_id.toString() === userId.toString();

    if (!isStudent && !isTutor) {
      throw new AppError(errorCodes.REVIEW_NOT_PARTICIPANT, 'Only session participants can submit reviews', 403);
    }

    const reviewerRole = isStudent ? 'student' : 'tutor';
    const revieweeId = isStudent ? session.tutor_id.user_id : session.student_id;

    // Check if already reviewed
    const existing = await Review.findOne({ session_id, reviewer_id: userId });
    if (existing) {
      throw new AppError(errorCodes.REVIEW_ALREADY_EXISTS, 'You already reviewed this session', 409);
    }

    const review = await Review.create({
      session_id,
      reviewer_id: userId,
      reviewee_id: revieweeId,
      reviewer_role: reviewerRole,
      rating,
      comment: comment ? comment.trim() : undefined,
    });

    // Update tutor avg_rating if reviewing a tutor
    if (reviewerRole === 'student') {
      await this._updateTutorRating(session.tutor_id._id);
    }

    logger.info('Review submitted', { sessionId: session_id, reviewerId: userId, rating });
    return review;
  }

  /**
   * Get reviews for a user (tutor public reviews)
   */
  async getReviewsForUser(userId, { page = 1, limit = 20 }) {
    const filter = { reviewee_id: userId, is_approved: true };
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('reviewer_id', 'name profile_photo_url')
        .populate('session_id', 'subject_id scheduled_at')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    return { reviews, total, page, limit };
  }

  /**
   * Get pending reviews for a user (sessions they haven't reviewed yet)
   */
  async getPendingReviews(userId) {
    // Find completed sessions where user participated but hasn't reviewed
    const sessions = await Session.find({
      $or: [{ student_id: userId }, { group_students: userId }],
      status: 'completed',
    }).select('_id');

    const sessionIds = sessions.map(s => s._id);
    const existingReviews = await Review.find({
      session_id: { $in: sessionIds },
      reviewer_id: userId,
    }).select('session_id');

    const reviewedSessionIds = existingReviews.map(r => r.session_id.toString());
    const pendingSessionIds = sessionIds.filter(id => !reviewedSessionIds.includes(id.toString()));

    const pendingSessions = await Session.find({ _id: { $in: pendingSessionIds } })
      .populate({
        path: 'tutor_id',
        populate: { path: 'user_id', select: 'name profile_photo_url' },
      })
      .populate('subject_id', 'name code');

    return pendingSessions;
  }

  /**
   * Admin: approve or reject a review
   */
  async moderateReview(reviewId, { is_approved, mod_note }) {
    const review = await Review.findByIdAndUpdate(
      reviewId,
      { is_approved, mod_note },
      { new: true }
    );
    if (!review) throw new AppError(errorCodes.REVIEW_NOT_FOUND, 'Review not found', 404);

    // Recalculate rating if approval status changed
    const session = await Session.findById(review.session_id);
    if (session) {
      await this._updateTutorRating(session.tutor_id);
    }

    return review;
  }

  /**
   * Admin: get reviews pending moderation
   */
  async getModerationQueue({ page = 1, limit = 20 }) {
    const filter = { is_approved: false };
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('reviewer_id', 'name email')
        .populate('reviewee_id', 'name email')
        .populate('session_id', 'subject_id scheduled_at')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    return { reviews, total, page, limit };
  }

  /**
   * Update tutor's average rating using Bayesian smoothing
   * Formula: (C * m + sum_of_ratings) / (C + total_reviews)
   * C = confidence parameter (e.g. 5), m = global mean rating
   */
  async _updateTutorRating(tutorProfileId) {
    const reviews = await Review.find({
      reviewer_role: 'student',
      is_approved: true,
    }).populate({
      path: 'session_id',
      match: { tutor_id: tutorProfileId },
      select: 'tutor_id',
    });

    const tutorReviews = reviews.filter(r => r.session_id && r.session_id.tutor_id.toString() === tutorProfileId.toString());

    if (tutorReviews.length === 0) return;

    const sum = tutorReviews.reduce((acc, r) => acc + r.rating, 0);
    const count = tutorReviews.length;

    // Bayesian smoothing (C=3, m=3.5)
    const C = 3;
    const m = 3.5;
    const avgRating = parseFloat(((C * m + sum) / (C + count)).toFixed(2));

    await TutorProfile.findByIdAndUpdate(tutorProfileId, {
      avg_rating: avgRating,
      total_ratings: count,
    });

    logger.info('Tutor rating updated', { tutorProfileId, avgRating, reviewCount: count });
  }
}

module.exports = new ReviewService();
