/**
 * Booking API Integration Tests
 * Tests booking creation, cancellation, and session lifecycle via HTTP.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../../src/config/redis', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    pipeline: () => ({
      set: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  };
  return {
    initRedis: jest.fn().mockResolvedValue(mockRedis),
    getRedis: () => mockRedis,
  };
});

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/config/env', () => ({
  port: 0,
  nodeEnv: 'test',
  jwt: { secret: 'test-secret-key-must-be-at-least-32-characters!', accessExpires: '15m', refreshExpires: '7d' },
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
  cors: { origins: ['http://localhost:5173'] },
  frontendUrl: 'http://localhost:5173',
  redis: { url: 'redis://localhost:6379' },
  google: {},
  sendgrid: {},
  cloudinary: {},
  ai: { engineUrl: 'http://localhost:8000' },
  jitsi: { domain: 'meet.jit.si' },
}));

jest.mock('../../src/jobs/worker', () => ({
  emailQueue: { add: jest.fn().mockResolvedValue({}) },
  notificationQueue: { add: jest.fn().mockResolvedValue({}) },
  aiQueue: { add: jest.fn().mockResolvedValue({}) },
  analyticsQueue: { add: jest.fn().mockResolvedValue({}) },
}));

jest.mock('../../src/utils/jitsi', () => ({
  generateJitsiLink: jest.fn(() => 'https://meet.jit.si/test-room'),
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(mongoServer.getUri());
  app = require('../../src/app');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const col of collections) await col.deleteMany({});
});

const request = require('supertest');
const { TutorProfile, Subject } = require('../../src/modules/tutors/tutor.model');
const { Wallet, Transaction } = require('../../src/modules/wallet/wallet.model');

async function registerAndGetToken(email, name, role = 'student') {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email, password: 'TestPass@123', name, year: 2, branch: 'CSE', role,
    });
  return {
    token: res.body.data.accessToken,
    user: res.body.data.user,
  };
}

describe('Booking API Integration', () => {
  let studentToken, tutorToken, studentUser, tutorUser;
  let tutorProfileId, subjectId;

  beforeEach(async () => {
    // Register student and tutor
    const s = await registerAndGetToken('student@test.org', 'Test Student', 'student');
    studentToken = s.token;
    studentUser = s.user;

    const t = await registerAndGetToken('tutor@test.org', 'Test Tutor', 'tutor');
    tutorToken = t.token;
    tutorUser = t.user;

    // Create subject
    const subject = await Subject.create({ name: 'Algorithms', code: 'CS301', department: 'CSE' });
    subjectId = subject._id;

    // Create tutor profile
    const tutorProfile = await TutorProfile.create({
      user_id: tutorUser._id, subjects: [subjectId],
      rate_per_hour: 30, bio: 'Algorithm expert',
    });
    tutorProfileId = tutorProfile._id;

    // Ensure student wallet has enough credits
    await Wallet.findOneAndUpdate(
      { user_id: studentUser._id },
      { $set: { balance: 100 } },
      { upsert: true }
    );
  });

  describe('POST /api/v1/bookings', () => {
    it('should create a booking', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          tutor_id: tutorProfileId.toString(),
          subject_id: subjectId.toString(),
          scheduled_at: future,
          duration_minutes: 60,
          help_description: 'Need help with sorting algorithms',
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.status).toBe('confirmed');
    });

    it('should reject booking without authentication', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();

      await request(app)
        .post('/api/v1/bookings')
        .send({
          tutor_id: tutorProfileId.toString(),
          subject_id: subjectId.toString(),
          scheduled_at: future,
          duration_minutes: 60,
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/bookings', () => {
    it('should list user bookings', async () => {
      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PATCH /api/v1/bookings/:id/cancel', () => {
    it('should cancel a booking', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();

      const createRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          tutor_id: tutorProfileId.toString(),
          subject_id: subjectId.toString(),
          scheduled_at: future,
          duration_minutes: 60,
        });

      const bookingId = createRes.body.data._id;

      const cancelRes = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ reason: 'Schedule conflict' })
        .expect(200);

      expect(cancelRes.body.data.session.status).toBe('cancelled');
    });
  });
});
