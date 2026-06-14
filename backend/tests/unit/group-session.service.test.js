/**
 * Group Session Service Unit Tests
 * Tests: createGroupSession, joinGroupSession, leaveGroupSession
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../../src/config/redis', () => ({
  getRedis: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    pipeline: () => ({
      set: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
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
  business: {
    welcomeCredits: 100,
    platformFeePercent: 10,
    maxBookingsPerDay: 5,
    minBookingLeadMinutes: 0,
    cancellationWindowMinutes: 0,
    creditsExpiryDays: 180,
    groupSession: {
      minParticipants: 2,
      maxParticipants: 10,
      discountPercent: 30,
    },
  },
  jitsi: { domain: 'meet.jit.si', baseUrl: 'https://meet.jit.si' },
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
  email: {
    service: 'sendgrid',
    from: 'test@example.com',
    apiKey: 'test-key'
  },
  database: {
    uri: 'mongodb://localhost:27017/test'
  }
}));

jest.mock('../../src/jobs/worker', () => ({
  notificationQueue: { add: jest.fn().mockResolvedValue({}) },
  emailQueue: { add: jest.fn().mockResolvedValue({}) },
  aiQueue: { add: jest.fn().mockResolvedValue({}) },
}));

jest.mock('../../src/utils/jitsi', () => ({
  generateJitsiLink: jest.fn(() => 'https://meet.jit.si/group-room'),
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

const { User } = require('../../src/modules/auth/auth.model');
const { TutorProfile, Subject } = require('../../src/modules/tutors/tutor.model');
const { Session } = require('../../src/modules/bookings/booking.model');
const walletService = require('../../src/modules/wallet/wallet.service');
const bookingService = require('../../src/modules/bookings/booking.service');

describe('Group Session Service', () => {
  let tutorUserId, tutorProfileId, subjectId;
  let student1Id, student2Id, student3Id;

  beforeEach(async () => {
    // Create tutor
    const tutorUser = await User.create({
      email: 'tutor@test.org', name: 'Group Tutor', password_hash: 'hash',
      role: 'tutor', year: 4, branch: 'CSE',
    });
    tutorUserId = tutorUser._id;

    const subject = await Subject.create({ name: 'Machine Learning', code: 'CS401', department: 'CSE' });
    subjectId = subject._id;

    const tutorProfile = await TutorProfile.create({
      user_id: tutorUserId, subjects: [subjectId],
      rate_per_hour: 40, bio: 'ML expert',
    });
    tutorProfileId = tutorProfile._id;

    // Create students
    const s1 = await User.create({
      email: 's1@test.org', name: 'Student 1', password_hash: 'hash',
      role: 'student', year: 2, branch: 'CSE',
    });
    student1Id = s1._id;

    const s2 = await User.create({
      email: 's2@test.org', name: 'Student 2', password_hash: 'hash',
      role: 'student', year: 3, branch: 'CSE',
    });
    student2Id = s2._id;

    const s3 = await User.create({
      email: 's3@test.org', name: 'Student 3', password_hash: 'hash',
      role: 'student', year: 2, branch: 'ECE',
    });
    student3Id = s3._id;

    // Create wallets
    await walletService.createWallet(tutorUserId);
    await walletService.createWallet(student1Id);
    await walletService.createWallet(student2Id);
    await walletService.createWallet(student3Id);
  });

  describe('createBooking (group)', () => {
    it('should create a group session booking', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const session = await bookingService.createBooking(student1Id, {
        tutor_id: tutorProfileId.toString(),
        subject_id: subjectId.toString(),
        scheduled_at: future,
        duration_minutes: 60,
        is_group_session: true,
        help_description: 'Group ML study session',
      });

      expect(session).toBeDefined();
      expect(session.is_group_session).toBe(true);
      expect(session.status).toBe('confirmed');
    });
  });

  describe('joinGroupSession', () => {
    it('should allow a second student to join a group session', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const session = await bookingService.createBooking(student1Id, {
        tutor_id: tutorProfileId.toString(),
        subject_id: subjectId.toString(),
        scheduled_at: future,
        duration_minutes: 60,
        is_group_session: true,
      });

      const updated = await bookingService.joinGroupSession(student2Id, session._id.toString());
      expect(updated.group_students).toBeDefined();
      expect(updated.group_students.map(id => id.toString())).toContain(student2Id.toString());
    });

    it('should prevent joining a non-group session', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const session = await bookingService.createBooking(student1Id, {
        tutor_id: tutorProfileId.toString(),
        subject_id: subjectId.toString(),
        scheduled_at: future,
        duration_minutes: 60,
        is_group_session: false,
      });

      await expect(
        bookingService.joinGroupSession(student2Id, session._id.toString())
      ).rejects.toThrow();
    });

    it('should prevent joining your own session', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const session = await bookingService.createBooking(student1Id, {
        tutor_id: tutorProfileId.toString(),
        subject_id: subjectId.toString(),
        scheduled_at: future,
        duration_minutes: 60,
        is_group_session: true,
      });

      await expect(
        bookingService.joinGroupSession(student1Id, session._id.toString())
      ).rejects.toThrow();
    });
  });
});
