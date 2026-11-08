const request = require('supertest');
const createApp = require('../app');
const { getConfig } = require('../config/env');

describe('Step 1 foundation', () => {
  test('home page renders the project name', async () => {
    const response = await request(createApp({ nodeEnv: 'test' })).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Sherubtse TripHub');
  });
  test('health responds without querying the database', async () => {
    const response = await request(createApp({ nodeEnv: 'test' })).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });
  test('development db diagnostic is absent in production', async () => {
    const response = await request(createApp({ nodeEnv: 'production' })).get('/dev/db-test');
    expect(response.statusCode).toBe(404);
  });
  test('production rejects placeholder credentials', () => {
    expect(() => getConfig({ NODE_ENV: 'production', PORT: '3000', EMAIL_MODE: 'api', STORAGE_MODE: 'r2' })).toThrow(/must be configured/);
  });
  test('log email mode is blocked in production', () => {
    expect(() => getConfig({ NODE_ENV: 'production', EMAIL_MODE: 'log', STORAGE_MODE: 'r2' })).toThrow(/EMAIL_MODE=api/);
  });
  test('invalid port is rejected', () => {
    expect(() => getConfig({ NODE_ENV: 'test', PORT: 'abc' })).toThrow(/PORT/);
  });
});
