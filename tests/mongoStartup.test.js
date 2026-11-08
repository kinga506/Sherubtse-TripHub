jest.mock('../config/db', () => ({ testConnection: jest.fn().mockResolvedValue(true) }));
jest.mock('../config/mongo', () => ({ connectMongo: jest.fn().mockResolvedValue({}) }));
jest.mock('../app', () => () => ({
  listen: (port, host, callback) => {
    if (callback) callback();
    return { port, host };
  }
}));

const { start } = require('../server');
const { testConnection } = require('../config/db');
const { connectMongo } = require('../config/mongo');

describe('optional MongoDB startup', () => {
  let previousNodeEnv;
  let previousEnableMongo;
  let previousMongoUri;

  beforeEach(() => {
    previousNodeEnv = process.env.NODE_ENV;
    previousEnableMongo = process.env.ENABLE_MONGODB;
    previousMongoUri = process.env.MONGO_URI;
    process.env.NODE_ENV = 'test';
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousEnableMongo === undefined) delete process.env.ENABLE_MONGODB;
    else process.env.ENABLE_MONGODB = previousEnableMongo;
    if (previousMongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousMongoUri;
    jest.restoreAllMocks();
  });

  test('keeps PostgreSQL startup check and skips MongoDB when disabled', async () => {
    process.env.ENABLE_MONGODB = 'false';
    const server = await start();

    expect(testConnection).toHaveBeenCalledTimes(1);
    expect(connectMongo).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('[STARTUP] MongoDB disabled for this deployment.');
    expect(server.host).toBe('0.0.0.0');
    expect(server.port).toBeGreaterThan(0);
  });

  test('continues to connect to MongoDB by default when enabled', async () => {
    delete process.env.ENABLE_MONGODB;
    process.env.MONGO_URI = 'mongodb://fictional.invalid/test';
    await start();

    expect(testConnection).toHaveBeenCalledTimes(1);
    expect(connectMongo).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith('[STARTUP] MongoDB connected successfully.');
  });
});
