const { Session } = require('../bookings/booking.model');
const { TutorProfile, Subject } = require('../tutors/tutor.model');
const walletService = require('../wallet/wallet.service');
const notificationService = require('../notifications/notification.service');
const { generateJitsiLink } = require('../../utils/jitsi');
const { AppError } = require('../../middleware/errorHandler');
const errorCodes = require('../../utils/errorCodes');
const logger = require('../../utils/logger');
const config = require('../../config/env');

class GroupSessionService {
  /**
   * Create a new group session (tutor only)
   */
  async createGroupSession(tutorUserId, data) {
    const { subject_id, title, description, scheduled_at, duration_minutes, max_participants } = data;

    // 1. Get tutor profile
    const tutorProfile = await TutorProfile.findOne({ user_id: tutorUserId });
    if (!tutorProfile) {
      throw new AppError(errorCodes.TUTOR_NOT_FOUND, 'You must have a tutor profile to create group sessions', 404);
    }

    // 2. Validate subject
    const subject = await Subject.findById(subject_id);
    if (!subject) {
      throw new AppError(errorCodes.SUBJECT_NOT_FOUND, 'Subject not found', 404);
    }

    // 3. Verify tutor teaches this subject
    if (!tutorProfile.subjects.map(s => s.toString()).includes(subject_id)) {
      throw new AppError(errorCodes.TUTOR_NOT_FOUND, 'You do not teach this subject', 400);
    }

    // 4. Check for time conflicts with tutor's existing sessions
    const scheduledDate = new Date(scheduled_at);
    const conflicting = await Session.findOne({
      tutor_id: tutorProfile._id,
      scheduled_at: {
        $gte: new Date(scheduledDate.getTime() - duration_minutes * 60000),
        $lte: new Date(scheduledDate.getTime() + duration_minutes * 60000),
      },
      status: { $in: ['pending', 'confirmed', 'active'] },
    });

    if (conflicting) {
      throw new AppError(errorCodes.BOOKING_SLOT_CONFLICT, 'You already have a session at this time', 409);
    }

    // 5. Calculate credits per student (rate × duration with group discount)
    const discount = config.business.groupDiscountPercent;
    const creditsPerStudent = Math.ceil(
      (duration_minutes / 60) * tutorProfile.rate_per_hour * (1 - discount / 100)
    );

    // 6. Create the group session
    const session = await Session.create({
      tutor_id: tutorProfile._id,
      student_id: tutorUserId, // Tutor is the creator (required field)
      subject_id,
      title,
      description,
      scheduled_at: scheduledDate,
      duration_minutes,
      is_group_session: true,
      max_participants: max_participants || config.business.maxGroupSessionSize,
      credits_reserved: 0,
      credits_per_student: creditsPerStudent,
      status: 'confirmed',
      video_link: generateJitsiLink(null, title || subject.name), // Generate after create
    });

    // Update video link with session ID
    session.video_link = generateJitsiLink(session._id.toString(), title || subject.name);
    await session.save();

    logger.info('Group session created', {
      sessionId: session._id,
      tutorUserId,
      title,
      maxParticipants: session.max_participants,
      creditsPerStudent,
    });

    return session;
  }

  /**
   * Discover available group sessions (public browsing)
   */
  async discoverGroupSessions({ subject_id, from_date, to_date, sort_by, page = 1, limit = 20 }) {
    const filter = {
      is_group_session: true,
      status: { $in: ['confirmed', 'active'] },
      scheduled_at: { $gte: new Date() }, // Only future sessions
    };

    if (subject_id) filter.subject_id = subject_id;
    if (from_date) filter.scheduled_at.$gte = new Date(from_date);
    if (to_date) {
      filter.scheduled_at.$lte = new Date(to_date);
    }

    // Determine sort
    let sortOption = { scheduled_at: 1 }; // Default: nearest first
    if (sort_by === 'price_low') sortOption = { credits_per_student: 1 };
    if (sort_by === 'price_high') sortOption = { credits_per_student: -1 };
    if (sort_by === 'seats') sortOption = { max_participants: -1 };

    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .populate({
          path: 'tutor_id',
          populate: { path: 'user_id', select: 'name email profile_photo_url' },
          select: 'user_id subjects rate_per_hour avg_rating total_sessions is_verified_badge',
        })
        .populate('subject_id', 'name code department')
        .populate('group_students', 'name profile_photo_url')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Session.countDocuments(filter),
    ]);

    // Add computed field: seats remaining
    const enriched = sessions.map(s => {
      const obj = s.toObject();
      obj.seats_remaining = s.max_participants - 1 - (s.group_students?.length || 0);
      obj.total_joined = 1 + (s.group_students?.length || 0);
      return obj;
    });

    return { sessions: enriched, total, page, limit };
  }

  /**
   * Get single group session with full details
   */
  async getGroupSession(sessionId) {
    const session = await Session.findById(sessionId)
      .populate({
        path: 'tutor_id',
        populate: { path: 'user_id', select: 'name email profile_photo_url' },
      })
      .populate('student_id', 'name email profile_photo_url')
      .populate('group_students', 'name email profile_photo_url')
      .populate('subject_id', 'name code department')
      .populate('attendance.student_id', 'name profile_photo_url');

    if (!session || !session.is_group_session) {
      throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Group session not found', 404);
    }

    const result = session.toObject();
    result.seats_remaining = session.max_participants - 1 - (session.group_students?.length || 0);
    result.total_joined = 1 + (session.group_students?.length || 0);

    return result;
  }

  /**
   * Join a group session
   */
  async joinGroupSession(studentId, sessionId) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);
    if (!session.is_group_session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Not a group session', 400);

    // Check if session is still open
    if (!['confirmed', 'active'].includes(session.status)) {
      throw new AppError(errorCodes.GROUP_SESSION_NOT_AVAILABLE, 'This session is no longer accepting participants', 400);
    }

    // Check if session is in the future
    if (new Date(session.scheduled_at) < new Date()) {
      throw new AppError(errorCodes.GROUP_SESSION_NOT_AVAILABLE, 'This session has already started', 400);
    }

    // Check seat availability
    const totalParticipants = 1 + (session.group_students?.length || 0);
    if (totalParticipants >= session.max_participants) {
      throw new AppError(errorCodes.SESSION_GROUP_FULL, 'This group session is full', 400);
    }

    // Check if already joined
    if (session.group_students.map(s => s.toString()).includes(studentId.toString()) ||
        session.student_id.toString() === studentId.toString()) {
      throw new AppError(errorCodes.GROUP_SESSION_ALREADY_JOINED, 'You have already joined this session', 409);
    }

    // Reserve credits
    const creditsRequired = session.credits_per_student;
    await walletService.reserveCredits(studentId, creditsRequired, sessionId);

    // Add to group
    session.group_students.push(studentId);
    session.credits_reserved += creditsRequired;
    await session.save();

    // Send notification
    await notificationService.create({
      user_id: studentId,
      type: 'booking_confirmed',
      title: 'Joined Group Session',
      message: `You've joined "${session.title}". ${creditsRequired} credits reserved.`,
      metadata: { sessionId: session._id },
    });

    // Notify tutor
    const tutorProfile = await TutorProfile.findById(session.tutor_id);
    if (tutorProfile) {
      await notificationService.create({
        user_id: tutorProfile.user_id,
        type: 'booking_confirmed',
        title: 'New Participant',
        message: `A student joined your group session "${session.title}".`,
        metadata: { sessionId: session._id },
      });
    }

    logger.info('Student joined group session', { studentId, sessionId, credits: creditsRequired });

    return this.getGroupSession(sessionId);
  }

  /**
   * Leave a group session (before it starts — refund credits)
   */
  async leaveGroupSession(studentId, sessionId) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);

    // Check if student is in the group
    const studentIdx = session.group_students.findIndex(s => s.toString() === studentId.toString());
    if (studentIdx === -1) {
      throw new AppError(errorCodes.GROUP_SESSION_NOT_PARTICIPANT, 'You are not in this group session', 400);
    }

    // Can only leave before session starts
    if (new Date(session.scheduled_at) < new Date()) {
      throw new AppError(errorCodes.GROUP_SESSION_ALREADY_STARTED, 'Cannot leave after the session has started', 400);
    }

    // Refund credits
    await walletService.refundCredits(studentId, session.credits_per_student, sessionId);

    // Remove from group
    session.group_students.splice(studentIdx, 1);
    session.credits_reserved -= session.credits_per_student;
    await session.save();

    // Notify student
    await notificationService.create({
      user_id: studentId,
      type: 'credits_received',
      title: 'Left Group Session',
      message: `You've left "${session.title}". ${session.credits_per_student} credits refunded.`,
      metadata: { sessionId: session._id },
    });

    logger.info('Student left group session', { studentId, sessionId });

    return { message: 'Successfully left the group session. Credits refunded.' };
  }

  /**
   * Record attendance (join/leave events during session)
   */
  async recordAttendance(sessionId, studentId, action) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);

    if (action === 'join') {
      // Add or update attendance entry
      const existing = session.attendance.find(a => a.student_id.toString() === studentId.toString());
      if (existing) {
        existing.joined_at = new Date();
        existing.left_at = null;
      } else {
        session.attendance.push({ student_id: studentId, joined_at: new Date() });
      }
    } else if (action === 'leave') {
      const entry = session.attendance.find(a => a.student_id.toString() === studentId.toString());
      if (entry) {
        entry.left_at = new Date();
        if (entry.joined_at) {
          entry.duration_seconds += Math.floor((entry.left_at - entry.joined_at) / 1000);
        }
      }
    }

    await session.save();
    return session.attendance;
  }

  /**
   * Complete group session — release credits for all participants to tutor
   */
  async completeGroupSession(sessionId, tutorUserId) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);
    if (!session.is_group_session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Not a group session', 400);

    if (session.status === 'completed') {
      throw new AppError(errorCodes.SESSION_ALREADY_COMPLETED, 'Session already completed', 400);
    }

    const tutorProfile = await TutorProfile.findById(session.tutor_id);
    if (!tutorProfile || tutorProfile.user_id.toString() !== tutorUserId.toString()) {
      throw new AppError(errorCodes.AUTH_FORBIDDEN, 'Only the tutor can complete the session', 403);
    }

    // Release credits from each participating student to tutor
    let totalTutorEarnings = 0;
    const participantIds = session.group_students || [];

    for (const studentId of participantIds) {
      try {
        const result = await walletService.releaseCredits(
          studentId,
          tutorUserId,
          session.credits_per_student,
          sessionId
        );
        totalTutorEarnings += result.tutorAmount;
      } catch (err) {
        logger.error('Failed to release credits for group participant', {
          studentId: studentId.toString(),
          sessionId,
          error: err.message,
        });
      }
    }

    // Update session
    session.status = 'completed';
    session.credits_released = totalTutorEarnings;
    await session.save();

    // Update tutor stats
    tutorProfile.total_sessions += 1;
    tutorProfile.checkVerificationBadge();
    await tutorProfile.save();

    // Notify all participants
    for (const studentId of participantIds) {
      await notificationService.create({
        user_id: studentId,
        type: 'session_completed',
        title: 'Group Session Completed',
        message: `"${session.title}" has ended. Please rate your experience!`,
        metadata: { sessionId: session._id },
      });
    }

    logger.info('Group session completed', {
      sessionId,
      participants: participantIds.length,
      totalEarnings: totalTutorEarnings,
    });

    return session;
  }

  /**
   * Upload post-session material (tutor only)
   */
  async uploadMaterial(sessionId, tutorUserId, { title, file_url }) {
    const session = await Session.findById(sessionId);
    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);

    const tutorProfile = await TutorProfile.findById(session.tutor_id);
    if (!tutorProfile || tutorProfile.user_id.toString() !== tutorUserId.toString()) {
      throw new AppError(errorCodes.AUTH_FORBIDDEN, 'Only the tutor can upload materials', 403);
    }

    session.post_session_materials.push({
      title,
      file_url,
      uploaded_by: tutorUserId,
    });
    await session.save();

    // Notify participants
    const participantIds = session.group_students || [];
    for (const studentId of participantIds) {
      await notificationService.create({
        user_id: studentId,
        type: 'general',
        title: 'New Study Material',
        message: `New material uploaded for "${session.title}": ${title}`,
        metadata: { sessionId: session._id },
      });
    }

    logger.info('Material uploaded for group session', { sessionId, title });
    return session;
  }

  /**
   * Get participants with attendance info
   */
  async getParticipants(sessionId) {
    const session = await Session.findById(sessionId)
      .populate('group_students', 'name email profile_photo_url')
      .populate('attendance.student_id', 'name profile_photo_url');

    if (!session) throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);

    return {
      participants: session.group_students,
      attendance: session.attendance,
      total: session.group_students.length,
      max: session.max_participants,
    };
  }
}

module.exports = new GroupSessionService();
