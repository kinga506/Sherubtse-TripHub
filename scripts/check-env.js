require('dotenv').config();
const { getConfig } = require('../config/env');
try {
  const config = getConfig();
  console.log(`Environment valid: ${config.nodeEnv}, storage=${config.storageMode}, email=${config.emailMode}`);
} catch (error) {
  console.error(`Environment invalid: ${error.message}`);
  process.exitCode = 1;
}
