/**
 * Review Service Unit Tests
 * Tests: submitReview, moderation, Bayesian rating
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../../src/config/redis', () => ({
  getRedis: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  }),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/config/env', () => ({
  jwt: { secret: 'test-secret-32-chars-minimum!!!!!', accessExpires: '15m', refreshExpires: '7d' },
  security: { maxLoginAttempts: 5, lockoutDuration: 30, saltRounds: 4 },
  college: {},
  business: { welcomeCredits: 50, platformFeePercent: 10, creditsExpiryDays: 180 },
}));

jest.mock('../../src/jobs/worker', () => ({
  notificationQueue: { add: jest.fn().mockResolvedValue({}) },
  emailQueue: { add: jest.fn().mockResolvedValue({}) },
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const col of collections) await col.deleteMany({});
  jest.clearAllMocks();
});

const { Review } = require('../../src/modules/reviews/review.model');
const { TutorProfile, Subject } = require('../../src/modules/tutors/tutor.model');
const { Session } = require('../../src/modules/bookings/booking.model');
const { User } = require('../../src/modules/auth/auth.model');
const reviewService = require('../../src/modules/reviews/review.service');

describe('ReviewService', () => {
  let studentId, tutorUserId, tutorProfileId, sessionId, subjectId;

  beforeEach(async () => {
    // Create student
    const student = await User.create({
      email: 'student@test.org', name: 'Student', password_hash: 'hash',
      role: 'student', year: 2, branch: 'CSE',
    });
    studentId = student._id;

    // Create tutor user
    const tutorUser = await User.create({
      email: 'tutor@test.org', name: 'Tutor', password_hash: 'hash',
      role: 'tutor', year: 3, branch: 'CSE',
    });
    tutorUserId = tutorUser._id;

    // Create subject
    const subject = await Subject.create({ name: 'DSA', code: 'CS201', department: 'CSE' });
    subjectId = subject._id;

    // Create tutor profile
    const tutorProfile = await TutorProfile.create({
      user_id: tutorUserId, subjects: [subjectId],
      rate_per_hour: 30, bio: 'Test tutor',
    });
    tutorProfileId = tutorProfile._id;

    // Create completed session
    const session = await Session.create({
      student_id: studentId, tutor_id: tutorProfileId, subject_id: subjectId,
      scheduled_at: new Date(), duration_minutes: 60, status: 'completed',
      credits_reserved: 30,
    });
    sessionId = session._id;
  });

  describe('submitReview', () => {
    it('should submit a review for a completed session', async () => {
      const review = await reviewService.submitReview(studentId, {
        session_id: sessionId.toString(),
        rating: 5,
        comment: 'Great session!',
      });

      expect(review).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.comment).toBe('Great session!');
      expect(review.is_approved).toBe(false); // Moderation enabled
    });

    it('should reject duplicate reviews', async () => {
      await reviewService.submitReview(studentId, {
        session_id: sessionId.toString(),
        rating: 4,
        comment: 'Good',
      });

      await expect(
        reviewService.submitReview(studentId, {
          session_id: sessionId.toString(),
          rating: 3,
          comment: 'Different',
        })
      ).rejects.toThrow();
    });
  });

  describe('moderateReview', () => {
    it('should approve a review', async () => {
      const review = await reviewService.submitReview(studentId, {
        session_id: sessionId.toString(),
        rating: 4,
        comment: 'Nice',
      });

      const moderated = await reviewService.moderateReview(review._id, {
        is_approved: true,
      });

      expect(moderated.is_approved).toBe(true);
    });

    it('should reject a review with a mod note', async () => {
      const review = await reviewService.submitReview(studentId, {
        session_id: sessionId.toString(),
        rating: 1,
        comment: 'Bad',
      });

      const moderated = await reviewService.moderateReview(review._id, {
        is_approved: false,
        mod_note: 'Inappropriate content',
      });

      expect(moderated.is_approved).toBe(false);
      expect(moderated.mod_note).toBe('Inappropriate content');
    });
  });

  describe('getModerationQueue', () => {
    it('should return unapproved reviews', async () => {
      await reviewService.submitReview(studentId, {
        session_id: sessionId.toString(),
        rating: 4,
        comment: 'Pending review',
      });

      const { reviews, total } = await reviewService.getModerationQueue({ page: 1, limit: 10 });

      expect(reviews.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(0);
      expect(reviews[0].is_approved).toBe(false);
    });
  });
});
