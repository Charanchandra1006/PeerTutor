const { Session } = require('./booking.model');
const { TutorProfile } = require('../tutors/tutor.model');
const { Subject } = require('../tutors/tutor.model');
const walletService = require('../wallet/wallet.service');
const { generateJitsiLink } = require('../../utils/jitsi');
const { AppError } = require('../../middleware/errorHandler');
const errorCodes = require('../../utils/errorCodes');
const logger = require('../../utils/logger');
const config = require('../../config/env');

class BookingService {
  /**
   * Create a new booking
   */
  async createBooking(studentId, { tutor_id, subject_id, scheduled_at, duration_minutes, help_description, is_group_session }) {
    // 1. Get tutor profile
    const tutorProfile = await TutorProfile.findById(tutor_id).populate('user_id');
    if (!tutorProfile) {
      throw new AppError(errorCodes.TUTOR_NOT_FOUND, 'Tutor not found', 404);
    }

    // Can't book yourself
    if (tutorProfile.user_id._id.toString() === studentId.toString()) {
      throw new AppError(errorCodes.BOOKING_CANNOT_BOOK_SELF, 'Cannot book a session with yourself', 400);
    }

    // 2. Validate subject
    const subject = await Subject.findById(subject_id);
    if (!subject) {
      throw new AppError(errorCodes.SUBJECT_NOT_FOUND, 'Subject not found', 404);
    }

    // 3. Check slot availability
    const scheduledDate = new Date(scheduled_at);
    const conflicting = await Session.findOne({
      tutor_id,
      scheduled_at: {
        $gte: new Date(scheduledDate.getTime() - duration_minutes * 60000),
        $lte: new Date(scheduledDate.getTime() + duration_minutes * 60000),
      },
      status: { $in: ['pending', 'confirmed', 'active'] },
    });

    if (conflicting) {
      throw new AppError(errorCodes.BOOKING_SLOT_CONFLICT, 'This time slot is already booked', 409);
    }

    // 4. Calculate credits
    let creditsRequired = Math.ceil((duration_minutes / 60) * tutorProfile.rate_per_hour);

    // Group session discount
    if (is_group_session) {
      const discount = config.business.groupDiscountPercent;
      creditsRequired = Math.ceil(creditsRequired * (1 - discount / 100));
    }

    // 5. Reserve credits (atomic)
    const session = await Session.create({
      tutor_id,
      student_id: studentId,
      subject_id,
      scheduled_at: scheduledDate,
      duration_minutes,
      credits_reserved: creditsRequired,
      help_description,
      is_group_session: is_group_session || false,
      max_participants: is_group_session ? config.business.maxGroupSessionSize : 1,
      status: 'pending',
    });

    // Reserve credits from student wallet
    await walletService.reserveCredits(studentId, creditsRequired, session._id);

    // Generate Jitsi link
    session.video_link = generateJitsiLink(session._id.toString(), subject.name);
    session.status = 'confirmed';
    await session.save();

    logger.info('Booking created', {
      sessionId: session._id,
      studentId,
      tutorId: tutor_id,
      credits: creditsRequired,
    });

    return session;
  }

  /**
   * Join group session
   */
  async joinGroupSession(studentId, sessionId) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);
    if (!session.is_group_session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Not a group session', 400);

    const totalParticipants = 1 + (session.group_students?.length || 0);
    if (totalParticipants >= session.max_participants) {
      throw new AppError(errorCodes.SESSION_GROUP_FULL, 'Group session is full', 400);
    }

    if (session.group_students.includes(studentId) || session.student_id.toString() === studentId.toString()) {
      throw new AppError(errorCodes.BOOKING_SLOT_CONFLICT, 'Already joined this session', 409);
    }

    // Reserve credits for joining student
    await walletService.reserveCredits(studentId, session.credits_reserved, sessionId);

    session.group_students.push(studentId);
    await session.save();

    return session;
  }

  /**
   * Get user's bookings (student + tutor view)
   */
  async getUserBookings(userId, { status, from_date, to_date, page = 1, limit = 20 }) {
    const filter = {
      $or: [{ student_id: userId }, { group_students: userId }],
    };

    // Also show bookings where user is the tutor
    const tutorProfile = await TutorProfile.findOne({ user_id: userId });
    if (tutorProfile) {
      filter.$or.push({ tutor_id: tutorProfile._id });
    }

    if (status) filter.status = status;
    if (from_date || to_date) {
      filter.scheduled_at = {};
      if (from_date) filter.scheduled_at.$gte = new Date(from_date);
      if (to_date) filter.scheduled_at.$lte = new Date(to_date);
    }

    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .populate('tutor_id', 'user_id subjects rate_per_hour avg_rating')
        .populate('student_id', 'name email profile_photo_url')
        .populate('subject_id', 'name code')
        .sort({ scheduled_at: -1 })
        .skip(skip)
        .limit(limit),
      Session.countDocuments(filter),
    ]);

    return { sessions, total, page, limit };
  }

  /**
   * Get single booking detail
   * SECURITY: Verifies the requesting user is a participant before returning data.
   */
  async getById(sessionId, userId) {
    const session = await Session.findById(sessionId)
      .populate({
        path: 'tutor_id',
        populate: { path: 'user_id', select: 'name email profile_photo_url' },
      })
      .populate('student_id', 'name email profile_photo_url')
      .populate('group_students', 'name email profile_photo_url')
      .populate('subject_id', 'name code department');

    if (!session) {
      throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);
    }

    // Ownership check — only participants and the tutor can view
    this._verifyParticipant(session, userId);

    return session;
  }

  /**
   * Cancel a booking
   * SECURITY: Only the student or tutor for this session can cancel.
   */
  async cancelBooking(sessionId, userId, reason) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);

    // Ownership check
    this._verifyParticipant(session, userId);

    if (['completed', 'cancelled'].includes(session.status)) {
      throw new AppError(errorCodes.BOOKING_ALREADY_CANCELLED, 'Booking is already completed or cancelled', 400);
    }

    // Check cancellation timing
    const hoursUntilSession = (new Date(session.scheduled_at) - new Date()) / (1000 * 60 * 60);
    const isLateCancellation = hoursUntilSession < 2;

    // Get tutor's user_id for refund
    const tutorProfile = await TutorProfile.findById(session.tutor_id);

    // Process refund
    await walletService.refundCredits(
      session.student_id,
      tutorProfile.user_id,
      session.credits_reserved,
      sessionId,
      isLateCancellation
    );

    session.status = 'cancelled';
    session.cancelled_at = new Date();
    session.cancellation_reason = reason || 'No reason provided';
    await session.save();

    logger.info('Booking cancelled', { sessionId, isLateCancellation, hoursUntilSession });

    return { session, isLateCancellation };
  }

  /**
   * Complete a session (tutor action)
   */
  async completeSession(sessionId, tutorUserId) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);

    if (session.status === 'completed') {
      throw new AppError(errorCodes.SESSION_ALREADY_COMPLETED, 'Session already completed', 400);
    }

    const tutorProfile = await TutorProfile.findById(session.tutor_id);
    if (!tutorProfile || tutorProfile.user_id.toString() !== tutorUserId.toString()) {
      throw new AppError(errorCodes.AUTH_FORBIDDEN, 'Only the tutor can complete a session', 403);
    }

    // Release credits (student → tutor, minus platform fee)
    const result = await walletService.releaseCredits(
      session.student_id,
      tutorUserId,
      session.credits_reserved,
      sessionId
    );

    session.status = 'completed';
    session.credits_released = result.tutorAmount;
    await session.save();

    // Update tutor stats
    tutorProfile.total_sessions += 1;
    tutorProfile.checkVerificationBadge();
    await tutorProfile.save();

    logger.info('Session completed', { sessionId, credits: result.tutorAmount });

    return session;
  }

  /**
   * Save session notes
   * SECURITY: Only participants can save notes.
   */
  async saveNotes(sessionId, userId, content) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);

    // Ownership check
    this._verifyParticipant(session, userId);

    session.notes = content;
    await session.save();

    return session;
  }

  /**
   * Get video link for a session
   * SECURITY: Only participants can access the video link.
   */
  async getVideoLink(sessionId, userId) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);

    // Ownership check
    this._verifyParticipant(session, userId);

    if (!session.video_link) {
      const subject = await Subject.findById(session.subject_id);
      session.video_link = generateJitsiLink(sessionId, subject?.name || 'Session');
      await session.save();
    }

    return { video_link: session.video_link };
  }

  /**
   * Verify that a user is a participant (student, group member, or tutor) of a session.
   * Throws 403 if the user has no relationship to the session.
   * @private
   */
  _verifyParticipant(session, userId) {
    const uid = userId.toString();
    const isStudent = session.student_id?.toString() === uid;
    const isGroupMember = session.group_students?.some(s => s.toString() === uid);

    // Check tutor — tutor_id can be populated (object) or raw ObjectId
    let isTutor = false;
    if (session.tutor_id) {
      if (session.tutor_id.user_id) {
        // Populated: tutor_id is a TutorProfile object with user_id
        const tutorUserId = session.tutor_id.user_id._id || session.tutor_id.user_id;
        isTutor = tutorUserId.toString() === uid;
      } else {
        // Not populated: we need to check by tutor profile ID (less common path)
        isTutor = session.tutor_id.toString() === uid;
      }
    }

    if (!isStudent && !isGroupMember && !isTutor) {
      throw new AppError(errorCodes.AUTH_FORBIDDEN, 'You do not have access to this session', 403);
    }
  }
  /**
   * Add a resource to a session
   */
  async addResource(sessionId, userId, { name, url, type }) {
    const session = await Session.findById(sessionId).populate('tutor_id');
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);

    this._verifyParticipant(session, userId);

    session.resources.push({
      name,
      url,
      uploaded_by: userId,
      type: type || 'link',
    });
    await session.save();

    logger.info('Resource added to session', { sessionId, userId, name });
    return session;
  }
}

module.exports = new BookingService();
