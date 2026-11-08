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

  test('Google provider does not require Resend credentials in production', () => {
    const env = productionEnv({
      ENABLE_MONGODB: 'false',
      EMAIL_PROVIDER: 'google-apps-script',
      GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/fake-deployment/exec',
      GOOGLE_SCRIPT_SECRET: 'fictional-shared-secret'
    });
    delete env.EMAIL_API_KEY;
    delete env.EMAIL_FROM;
    expect(getConfig(env).emailProvider).toBe('google-apps-script');
  });

  test('rejects values other than true or false', () => {
    expect(() => getConfig({ NODE_ENV: 'test', ENABLE_MONGODB: 'disabled' }))
      .toThrow(/ENABLE_MONGODB must be true or false/);
  });
});

describe('email provider environment configuration', () => {
  const googleEmailEnv = {
    NODE_ENV: 'development',
    EMAIL_MODE: 'api',
    EMAIL_PROVIDER: 'google-apps-script',
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/fake-deployment/exec',
    GOOGLE_SCRIPT_SECRET: 'fictional-shared-secret'
  };

  test('Google Apps Script requires only its own credentials', () => {
    expect(getConfig(googleEmailEnv).emailProvider).toBe('google-apps-script');
  });

  test('validates the Apps Script deployment URL outside production too', () => {
    expect(() => getConfig({ ...googleEmailEnv, GOOGLE_SCRIPT_URL: 'http://invalid.test' }))
      .toThrow(/valid HTTPS Google Apps Script/);
  });

  test('requires a configured shared secret for the selected Google provider', () => {
    expect(() => getConfig({ ...googleEmailEnv, GOOGLE_SCRIPT_SECRET: '' }))
      .toThrow(/GOOGLE_SCRIPT_SECRET must be configured/);
  });

  test('Resend credentials are required only when Resend is selected', () => {
    expect(() => getConfig({
      NODE_ENV: 'development', EMAIL_MODE: 'api', EMAIL_PROVIDER: 'resend'
    })).toThrow(/EMAIL_API_KEY must be configured/);
  });
});
