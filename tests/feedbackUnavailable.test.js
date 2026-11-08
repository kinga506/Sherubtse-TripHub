jest.mock('../middleware/authorization', () => ({
  requireStudent: (req, res, next) => next()
}));
jest.mock('../controllers/feedbackController', () => ({
  studentPage: (req, res) => res.status(200).send('Feedback controller reached'),
  submit: (req, res) => res.status(200).send('Feedback controller reached'),
  coordinatorPage: (req, res) => res.status(200).send('Feedback controller reached')
}));

const express = require('express');
const request = require('supertest');
const feedbackRoutes = require('../routes/feedback');

function appWithMongo(enabled) {
  const app = express();
  app.locals.enableMongo = enabled;
  app.use(feedbackRoutes);
  return app;
}

describe('feedback routes without MongoDB', () => {
  test.each([
    ['GET', '/workspace/trips/7/feedback'],
    ['POST', '/workspace/trips/7/feedback'],
    ['GET', '/workspace/trips/7/feedback/summary']
  ])('%s %s returns a friendly 503 while MongoDB is disabled', async (method, path) => {
    const response = await request(appWithMongo(false))[method.toLowerCase()](path);
    expect(response.status).toBe(503);
    expect(response.text).toContain('Trip feedback is temporarily unavailable');
  });

  test('continues to route feedback requests when MongoDB is enabled', async () => {
    const response = await request(appWithMongo(true)).get('/workspace/trips/7/feedback');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Feedback controller reached');
  });
});
