/**
 * Test Setup — MongoDB Memory Server + Mock Redis
 * Provides isolated in-memory databases for unit tests.
 */
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Redis mock — in-memory key-value store
 */
class RedisMock {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    const ttl = this.ttls.get(key);
    if (ttl && ttl < Date.now()) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key, value, ...args) {
    this.store.set(key, value);
    // Handle 'EX' ttl argument
    const exIdx = args.indexOf('EX');
    if (exIdx !== -1 && args[exIdx + 1]) {
      this.ttls.set(key, Date.now() + args[exIdx + 1] * 1000);
    }
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
    return 1;
  }

  async keys(pattern) {
    const prefix = pattern.replace('*', '');
    return Array.from(this.store.keys()).filter(k => k.startsWith(prefix));
  }

  pipeline() {
    const batch = [];
    const self = this;
    const pipe = {
      set: (...args) => { batch.push({ op: 'set', args }); return pipe; },
      del: (...args) => { batch.push({ op: 'del', args }); return pipe; },
      exec: async () => {
        const results = [];
        for (const cmd of batch) {
          const result = await self[cmd.op](...cmd.args);
          results.push([null, result]);
        }
        return results;
      },
    };
    return pipe;
  }
}

const mockRedis = new RedisMock();

/**
 * Connect to in-memory MongoDB replica set before all tests
 */
const setupDB = async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

/**
 * Close connection and stop server after all tests
 */
const teardownDB = async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
};

/**
 * Clear all collections between tests
 */
const clearDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  mockRedis.store.clear();
  mockRedis.ttls.clear();
};

module.exports = { setupDB, teardownDB, clearDB, mockRedis };
