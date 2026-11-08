
require('dotenv').config();

const { getConfig } = require('./config/env');
const { testConnection } = require('./config/db');
const { connectMongo } = require('./config/mongo');
const { postgresFailure, mongoFailure } = require('./config/startupDiagnostics');
const createApp = require('./app');

async function start() {
  console.log('[STARTUP] Loading configuration...');

  const config = getConfig();

  console.log('[STARTUP] Configuration loaded.');

  console.log('[STARTUP] Testing Neon PostgreSQL...');

  try {
    const connected = await testConnection();

    if (!connected) {
      throw new Error('PostgreSQL connection test failed');
    }

    console.log('[STARTUP] PostgreSQL connected successfully.');
  } catch (error) {
    console.error('[STARTUP] PostgreSQL connection failed:', postgresFailure(error));
    throw error;
  }

  console.log('[STARTUP] Connecting to MongoDB Atlas...');

  try {
    await connectMongo();

    console.log('[STARTUP] MongoDB connected successfully.');
  } catch (error) {
    console.error('[STARTUP] MongoDB connection failed:', mongoFailure(error));
    throw error;
  }

  const app = createApp(config);

  console.log('[STARTUP] Express application initialized.');

  const server = app.listen(
    config.port,
    '0.0.0.0',
    () => {
      console.log(
        `[STARTUP] Sherubtse TripHub running at ${config.appUrl}`
      );
    }
  );

  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error(
      '[STARTUP] Application startup failed:',
      error.name
    );

    process.exitCode = 1;
  });
}

module.exports = { start };
