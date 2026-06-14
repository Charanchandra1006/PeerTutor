/**
 * Auth Service Unit Tests
 * Tests: register, login, lockout, token generation
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock dependencies
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
  jwt: {
    secret: 'test-secret-key-min-32-chars-long!!',
    accessExpires: '15m',
    refreshExpires: '7d',
  },
  security: {
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    saltRounds: 4, // Fast for tests
  },
  college: {},
  business: {
    welcomeCredits: 50,
    creditsExpiryDays: 180,
  },
}));

jest.mock('../../src/modules/wallet/wallet.service', () => ({
  createWallet: jest.fn().mockResolvedValue({ balance: 50 }),
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
const authService = require('../../src/modules/auth/auth.service');

describe('AuthService', () => {
  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await authService.register({
        email: 'test@example.org',
        password: 'Test@1234',
        name: 'Test User',
        year: 3,
        branch: 'CSE',
        role: 'student',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('email', 'test@example.org');
      expect(result.user).toHaveProperty('name', 'Test User');
    });

    it('should reject duplicate email registration', async () => {
      await authService.register({
        email: 'dup@example.org',
        password: 'Test@1234',
        name: 'First User',
        year: 2,
        branch: 'ECE',
        role: 'student',
      });

      await expect(
        authService.register({
          email: 'dup@example.org',
          password: 'Test@1234',
          name: 'Second User',
          year: 2,
          branch: 'ECE',
          role: 'student',
        })
      ).rejects.toThrow();
    });

    it('should hash the password', async () => {
      const result = await authService.register({
        email: 'hash@example.org',
        password: 'MyPassword123',
        name: 'Hash Test',
        year: 1,
        branch: 'IT',
        role: 'student',
      });

      const user = await User.findById(result.user._id);
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe('MyPassword123');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'login@example.org',
        password: 'LoginTest@123',
        name: 'Login User',
        year: 2,
        branch: 'CSE',
        role: 'student',
      });
    });

    it('should login with correct credentials', async () => {
      const result = await authService.login({
        email: 'login@example.org',
        password: 'LoginTest@123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('login@example.org');
    });

    it('should reject wrong password', async () => {
      await expect(
        authService.login({
          email: 'login@example.org',
          password: 'WrongPassword',
        })
      ).rejects.toThrow();
    });

    it('should reject non-existent email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.org',
          password: 'Whatever',
        })
      ).rejects.toThrow();
    });
  });
});
