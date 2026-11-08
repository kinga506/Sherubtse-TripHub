const { getConfig } = require('./env');
const { createLocalStorage } = require('../services/storage/local');
const { createR2Storage } = require('../services/storage/r2');

function getStorage(config = getConfig()) {
  return config.storageMode === 'r2'
    ? createR2Storage(config.r2)
    : createLocalStorage(config.localUploadDir);
}
module.exports = { getStorage };
