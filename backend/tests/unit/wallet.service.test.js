/**
 * Wallet Service Unit Tests
 * Tests: createWallet, getWallet, reserve/release, dispute
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
  business: { welcomeCredits: 50, platformFeePercent: 10, creditsExpiryDays: 180 },
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

const walletService = require('../../src/modules/wallet/wallet.service');
const { Wallet, Transaction } = require('../../src/modules/wallet/wallet.model');

describe('WalletService', () => {
  const userId = new mongoose.Types.ObjectId();

  describe('createWallet', () => {
    it('should create a wallet with welcome credits', async () => {
      const wallet = await walletService.createWallet(userId);

      expect(wallet).toBeDefined();
      expect(wallet.user_id.toString()).toBe(userId.toString());
      expect(wallet.balance).toBe(50);
    });

    it('should create a welcome transaction', async () => {
      await walletService.createWallet(userId);

      const tx = await Transaction.findOne({ user_id: userId, type: 'welcome' });
      expect(tx).toBeDefined();
      expect(tx.amount).toBe(50);
    });

    it('should not create duplicate wallet', async () => {
      await walletService.createWallet(userId);
      await expect(walletService.createWallet(userId)).rejects.toThrow();
    });
  });

  describe('getWallet', () => {
    it('should return wallet for existing user', async () => {
      await walletService.createWallet(userId);
      const wallet = await walletService.getWallet(userId);

      expect(wallet).toBeDefined();
      expect(wallet.balance).toBe(50);
    });

    it('should throw for non-existent wallet', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(walletService.getWallet(fakeId)).rejects.toThrow();
    });
  });

  describe('reserveCredits', () => {
    it('should reserve credits from balance', async () => {
      await walletService.createWallet(userId);
      const wallet = await walletService.reserveCredits(userId, 20, 'test-session');

      expect(wallet.balance).toBe(30);
      expect(wallet.reserved_balance).toBe(20);
    });

    it('should reject when insufficient balance', async () => {
      await walletService.createWallet(userId);
      await expect(
        walletService.reserveCredits(userId, 100, 'test-session')
      ).rejects.toThrow();
    });
  });

  describe('releaseCredits', () => {
    it('should release reserved credits to tutor', async () => {
      const tutorId = new mongoose.Types.ObjectId();
      await walletService.createWallet(userId);
      await walletService.createWallet(tutorId);

      await walletService.reserveCredits(userId, 20, 'test-session');
      await walletService.releaseCredits(userId, tutorId, 20, 'test-session');

      const tutorWallet = await walletService.getWallet(tutorId);
      expect(tutorWallet.balance).toBe(68); // 50 welcome + 20 - 2 fee (10%)

      const studentWallet = await walletService.getWallet(userId);
      expect(studentWallet.reserved_balance).toBe(0);
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      await walletService.createWallet(userId);
      const result = await walletService.getTransactions(userId, { page: 1, limit: 10 });

      expect(result.transactions).toBeDefined();
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });
  });
});
