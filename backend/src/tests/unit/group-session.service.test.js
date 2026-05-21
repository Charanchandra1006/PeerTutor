/**
 * Group Session Service — Unit Tests
 */
const { setupDB, teardownDB, clearDB, mockRedis } = require('../fixtures/test-setup');
const mongoose = require('mongoose');

// Mock Redis
jest.mock('../../config/redis', () => ({
  createRedisClient: jest.fn(() => mockRedis),
  getRedis: jest.fn(() => mockRedis),
  disconnectRedis: jest.fn(),
}));

// Mock env config
jest.mock('../../config/env', () => ({
  env: 'test',
  business: {
    platformFeePercent: 10,
    welcomeCredits: 50,
    maxGroupSessionSize: 50,
    groupDiscountPercent: 60,
  },
}));

// Mock notification service
jest.mock('../../modules/notifications/notification.service', () => ({
  create: jest.fn().mockResolvedValue({}),
}));

const groupSessionService = require('../../modules/group-sessions/group-session.service');
const walletService = require('../../modules/wallet/wallet.service');
const { Session } = require('../../modules/bookings/booking.model');
const { TutorProfile, Subject } = require('../../modules/tutors/tutor.model');
const { User } = require('../../modules/auth/auth.model');

beforeAll(async () => await setupDB());
afterAll(async () => await teardownDB());
afterEach(async () => await clearDB());

/**
 * Helper: set up complete test data
 */
async function setupData() {
  const student1 = await User.create({ email: 's1@test.com', password_hash: 'hash', name: 'Student 1', role: 'student', is_email_verified: true });
  const student2 = await User.create({ email: 's2@test.com', password_hash: 'hash', name: 'Student 2', role: 'student', is_email_verified: true });
  await walletService.createWallet(student1._id);
  await walletService.createWallet(student2._id);

  const tutorUser = await User.create({ email: 'tutor@test.com', password_hash: 'hash', name: 'Tutor', role: 'tutor', is_email_verified: true });
  await walletService.createWallet(tutorUser._id);

  const subject = await Subject.create({ name: 'DBMS', code: 'CS301', department: 'CS' });

  const tutorProfile = await TutorProfile.create({
    user_id: tutorUser._id,
    subjects: [subject._id],
    bio: 'Test tutor bio with more than ten characters',
    rate_per_hour: 100, // Makes math easy: 60% discount = 40 credits per hour
  });

  return { student1, student2, tutorUser, subject, tutorProfile };
}

describe('GroupSessionService', () => {
  describe('createGroupSession()', () => {
    it('should create a group session with calculated credits', async () => {
      const { tutorUser, subject } = await setupData();

      const scheduledAt = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
      
      const session = await groupSessionService.createGroupSession(tutorUser._id, {
        subject_id: subject._id.toString(),
        title: 'DBMS Crash Course',
        description: 'Complete revision',
        scheduled_at: scheduledAt,
        duration_minutes: 60,
        max_participants: 20,
      });

      expect(session).toBeDefined();
      expect(session.is_group_session).toBe(true);
      expect(session.title).toBe('DBMS Crash Course');
      // rate_per_hour (100) * (60/60) * (1 - 0.6) = 40 credits per student
      expect(session.credits_per_student).toBe(40);
      expect(session.max_participants).toBe(20);
      expect(session.status).toBe('confirmed');
    });
  });

  describe('joinGroupSession()', () => {
    it('should allow student to join and reserve credits', async () => {
      const { student1, tutorUser, subject } = await setupData();

      const scheduledAt = new Date(Date.now() + 86400000).toISOString();
      const session = await groupSessionService.createGroupSession(tutorUser._id, {
        subject_id: subject._id.toString(),
        title: 'DBMS Course',
        scheduled_at: scheduledAt,
        duration_minutes: 60,
      });

      // Give student enough credits
      const studentWallet = await walletService.getWallet(student1._id);
      expect(studentWallet.balance).toBeGreaterThanOrEqual(40); // Has welcome credits

      const joinedSession = await groupSessionService.joinGroupSession(student1._id, session._id);

      expect(joinedSession.group_students).toHaveLength(1);
      expect(joinedSession.group_students[0]._id.toString()).toBe(student1._id.toString());
      
      const updatedWallet = await walletService.getWallet(student1._id);
      expect(updatedWallet.balance).toBe(studentWallet.balance - 40); // 40 credits reserved
    });

    it('should prevent joining if already started', async () => {
      const { student1, tutorUser, subject } = await setupData();

      const scheduledAt = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago (mocking bypass conflict check)
      const session = await Session.create({
        tutor_id: tutorUser._id,
        student_id: tutorUser._id,
        subject_id: subject._id,
        title: 'Past Session',
        scheduled_at: new Date(scheduledAt),
        duration_minutes: 60,
        is_group_session: true,
        credits_per_student: 40,
        status: 'confirmed',
      });

      await expect(
        groupSessionService.joinGroupSession(student1._id, session._id)
      ).rejects.toThrow('This session has already started');
    });
  });

  describe('leaveGroupSession()', () => {
    it('should allow student to leave and refund credits', async () => {
      const { student1, tutorUser, subject } = await setupData();

      const scheduledAt = new Date(Date.now() + 86400000).toISOString();
      const session = await groupSessionService.createGroupSession(tutorUser._id, {
        subject_id: subject._id.toString(),
        title: 'DBMS Course',
        scheduled_at: scheduledAt,
        duration_minutes: 60,
      });

      await groupSessionService.joinGroupSession(student1._id, session._id);
      
      const walletBeforeLeave = await walletService.getWallet(student1._id);
      
      await groupSessionService.leaveGroupSession(student1._id, session._id);

      const updatedSession = await Session.findById(session._id);
      expect(updatedSession.group_students).toHaveLength(0);

      const walletAfterLeave = await walletService.getWallet(student1._id);
      expect(walletAfterLeave.balance).toBe(walletBeforeLeave.balance + 40);
    });
  });

  describe('completeGroupSession()', () => {
    it('should complete session and release credits to tutor', async () => {
      const { student1, student2, tutorUser, subject } = await setupData();

      const scheduledAt = new Date(Date.now() + 86400000).toISOString();
      const session = await groupSessionService.createGroupSession(tutorUser._id, {
        subject_id: subject._id.toString(),
        title: 'DBMS Course',
        scheduled_at: scheduledAt,
        duration_minutes: 60,
      });

      await groupSessionService.joinGroupSession(student1._id, session._id);
      await groupSessionService.joinGroupSession(student2._id, session._id);

      const tutorWalletBefore = await walletService.getWallet(tutorUser._id);

      // Complete session
      const completedSession = await groupSessionService.completeGroupSession(session._id, tutorUser._id);

      expect(completedSession.status).toBe('completed');
      
      const tutorWalletAfter = await walletService.getWallet(tutorUser._id);
      
      // 2 students * 40 credits = 80 total.
      // Platform fee is 10%, so tutor gets 80 * 0.9 = 72 credits.
      expect(tutorWalletAfter.balance).toBe(tutorWalletBefore.balance + 72);
      expect(completedSession.credits_released).toBe(72);
    });
  });
});
