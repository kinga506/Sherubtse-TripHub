require('dotenv').config();
const path = require('node:path');
const {getDb} = require('../config/db');
const seed = require('../db/seed-data.json');
const {initializeDestinations} = require('../services/initializeDestinations');

async function run() {
  const result = await initializeDestinations({
    db:getDb(),
    seedDestinations:seed.destinations,
    imageRoot:path.join(__dirname,'../public/images/destinations')
  });
  process.stdout.write(`Verified ${result.destinationCount} destination records and ${result.photoCount} photo references.\n`);
}

if (require.main === module) {
  run().catch(error => {
    process.stderr.write(`Destination initialization failed: ${error.message}\n`);
    process.exitCode = 1;
  }).finally(async () => {
    try { await getDb().$pool.end(); } catch (_) {}
  });
}

module.exports = {run};
