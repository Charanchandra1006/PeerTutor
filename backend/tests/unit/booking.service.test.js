/**
 * Booking Service Unit Tests
 * Tests: createBooking, cancelBooking, completeSession, addResource
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
  },
  jitsi: { domain: 'meet.jit.si' },
}));

jest.mock('../../src/jobs/worker', () => ({
  notificationQueue: { add: jest.fn().mockResolvedValue({}) },
  emailQueue: { add: jest.fn().mockResolvedValue({}) },
  aiQueue: { add: jest.fn().mockResolvedValue({}) },
}));

jest.mock('../../src/utils/jitsi', () => ({
  generateJitsiLink: jest.fn(() => 'https://meet.jit.si/test-room'),
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
const { Wallet } = require('../../src/modules/wallet/wallet.model');
const walletService = require('../../src/modules/wallet/wallet.service');
const bookingService = require('../../src/modules/bookings/booking.service');

describe('BookingService', () => {
  let studentId, tutorUserId, tutorProfileId, subjectId;

  beforeEach(async () => {
    const student = await User.create({
      email: 'student@test.org', name: 'Student', password_hash: 'hash',
      role: 'student', year: 2, branch: 'CSE',
    });
    studentId = student._id;

    const tutorUser = await User.create({
      email: 'tutor@test.org', name: 'Tutor', password_hash: 'hash',
      role: 'tutor', year: 3, branch: 'CSE',
    });
    tutorUserId = tutorUser._id;

    const subject = await Subject.create({ name: 'DSA', code: 'CS201', department: 'CSE' });
    subjectId = subject._id;

    const tutorProfile = await TutorProfile.create({
      user_id: tutorUserId, subjects: [subjectId],
      rate_per_hour: 30, bio: 'Test tutor',
    });
    tutorProfileId = tutorProfile._id;

    // Create wallets
    await walletService.createWallet(studentId);
    await walletService.createWallet(tutorUserId);
  });

  describe('createBooking', () => {
    it('should create a booking and reserve credits', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const session = await bookingService.createBooking(studentId, {
        tutor_id: tutorProfileId.toString(),
        subject_id: subjectId.toString(),
        scheduled_at: future,
        duration_minutes: 60,
        help_description: 'Help with linked lists',
      });

      expect(session).toBeDefined();
      expect(session.status).toBe('confirmed');
      expect(session.credits_reserved).toBe(30);

      // Check wallet was debited
      const wallet = await walletService.getWallet(studentId);
      expect(wallet.balance).toBe(70); // 100 - 30
    });

    it('should prevent self-booking', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      await expect(
        bookingService.createBooking(tutorUserId, {
          tutor_id: tutorProfileId.toString(),
          subject_id: subjectId.toString(),
          scheduled_at: future,
          duration_minutes: 60,
        })
      ).rejects.toThrow();
    });

    it('should reject booking with insufficient credits', async () => {
      // Drain wallet
      const wallet = await Wallet.findOne({ user_id: studentId });
      wallet.balance = 5;
      await wallet.save();

      const future = new Date(Date.now() + 86400000).toISOString();
      await expect(
        bookingService.createBooking(studentId, {
          tutor_id: tutorProfileId.toString(),
          subject_id: subjectId.toString(),
          scheduled_at: future,
          duration_minutes: 60,
        })
      ).rejects.toThrow();
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a pending booking and refund credits', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const session = await bookingService.createBooking(studentId, {
        tutor_id: tutorProfileId.toString(),
        subject_id: subjectId.toString(),
        scheduled_at: future,
        duration_minutes: 60,
      });

      const result = await bookingService.cancelBooking(session._id.toString(), studentId, 'Changed plans');
      expect(result.session.status).toBe('cancelled');

      // Check refund
      const wallet = await walletService.getWallet(studentId);
      expect(wallet.balance).toBe(100); // Fully refunded
    });
  });

  describe('addResource', () => {
    it('should add a resource to a session', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const session = await bookingService.createBooking(studentId, {
        tutor_id: tutorProfileId.toString(),
        subject_id: subjectId.toString(),
        scheduled_at: future,
        duration_minutes: 60,
      });

      const updated = await bookingService.addResource(session._id.toString(), studentId, {
        name: 'Study Guide',
        url: 'https://example.com/guide.pdf',
        type: 'pdf',
      });

      expect(updated.resources).toHaveLength(1);
      expect(updated.resources[0].name).toBe('Study Guide');
    });
  });
});
