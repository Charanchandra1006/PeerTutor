/**
 * Auth API Integration Tests
 * Tests the full request-response cycle via supertest.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createServer } = require('http');

// Must mock BEFORE requiring app
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
  business: { welcomeCredits: 50, platformFeePercent: 10, creditsExpiryDays: 180 },
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

jest.mock('../../src/modules/wallet/wallet.service', () => ({
  createWallet: jest.fn().mockResolvedValue({ balance: 50 }),
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(mongoServer.getUri());

  // Require app after mocking
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

describe('Auth API Integration', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'integ@test.org',
          password: 'IntegTest@123',
          name: 'Integration User',
          year: 2,
          branch: 'CSE',
          role: 'student',
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe('integ@test.org');
    });

    it('should return 409 for duplicate email', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'dup@test.org',
          password: 'DupTest@123',
          name: 'Dup User',
          year: 2,
          branch: 'CSE',
          role: 'student',
        })
        .expect(201);

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'dup@test.org',
          password: 'DupTest@123',
          name: 'Dup User 2',
          year: 3,
          branch: 'ECE',
          role: 'student',
        })
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'bad@test.org' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'login@test.org',
          password: 'Login@123',
          name: 'Login User',
          year: 2,
          branch: 'CSE',
          role: 'student',
        });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@test.org', password: 'Login@123' })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe('login@test.org');
    });

    it('should reject invalid password', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@test.org', password: 'WrongPass' })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'me@test.org',
          password: 'MeTest@123',
          name: 'Me User',
          year: 3,
          branch: 'IT',
          role: 'student',
        });

      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.email).toBe('me@test.org');
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .expect(401);
    });
  });
});
