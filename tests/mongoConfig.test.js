const { getConfig } = require('../config/env');

function productionEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    PORT: '10000',
    DB_HOST: 'ep-green-river-123.neon.tech',
    DB_NAME: 'neondb',
    DB_USER: 'neondb_owner',
    DB_PASS: 'fictional-password',
    DB_SSL: 'true',
    SESSION_SECRET: 'fictional-session-secret-with-more-than-32-characters',
    APP_URL: 'https://localhost',
    EMAIL_MODE: 'api',
    EMAIL_PROVIDER: 'resend',
    EMAIL_API_KEY: 'fictional-api-key',
    EMAIL_FROM: 'TripHub <noreply@localhost>',
    STORAGE_MODE: 'r2',
    R2_ACCOUNT_ID: 'fictional-account',
    R2_BUCKET: 'fictional-bucket',
    R2_ACCESS_KEY_ID: 'fictional-access-key',
    R2_SECRET_ACCESS_KEY: 'fictional-secret-key',
    ...overrides
  };
}

describe('optional MongoDB environment configuration', () => {
  test('defaults MongoDB to enabled for backward compatibility', () => {
    expect(getConfig({ NODE_ENV: 'test' }).enableMongo).toBe(true);
  });

  test('allows PostgreSQL-only production without MONGO_URI', () => {
    const config = getConfig(productionEnv({ ENABLE_MONGODB: 'false' }));
    expect(config.enableMongo).toBe(false);
  });

  test('requires MONGO_URI in production when MongoDB is enabled', () => {
    expect(() => getConfig(productionEnv({ ENABLE_MONGODB: 'true' })))
      .toThrow(/MONGO_URI must be configured/);
  });

  test('rejects values other than true or false', () => {
    expect(() => getConfig({ NODE_ENV: 'test', ENABLE_MONGODB: 'disabled' }))
      .toThrow(/ENABLE_MONGODB must be true or false/);
  });
});
