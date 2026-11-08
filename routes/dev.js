const router = require('express').Router();
const { testConnection } = require('../config/db');

// Temporary Step 1 route. It is mounted only in NODE_ENV=development.
router.get('/db-test', async (req, res) => {
  try {
    if (await testConnection()) return res.json({ database: 'connected' });
    return res.status(503).json({ database: 'unavailable' });
  } catch (error) {
    // Never send database hostnames, credentials, or full error objects to the browser.
    console.error('Development database check failed:', error.message);
    return res.status(503).json({ database: 'unavailable', hint: 'Check local PostgreSQL and .env settings' });
  }
});
module.exports = router;
