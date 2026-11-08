require('dotenv').config();
const { getConfig } = require('./config/env');
const createApp = require('./app');
const {connectMongo}=require('./config/mongo');

async function start() {
  const config = getConfig();
  await connectMongo();
  const app = createApp(config);
  const server = app.listen(config.port, () => {
    console.log(`Sherubtse TripHub running at ${config.appUrl}`);
  });
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Startup failed:', error.message);
    process.exitCode = 1;
  });
}
module.exports = { start };
