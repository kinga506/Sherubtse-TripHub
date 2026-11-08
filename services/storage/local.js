const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function validateKey(key) {
  if (!/^[a-f0-9]{32}$/.test(key)) throw new Error('Invalid private object key');
}

function createLocalStorage(root) {
  const directory = path.resolve(root);
  return {
    async put(bytes) {
      if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new Error('Nonempty Buffer required');
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      const key = crypto.randomBytes(16).toString('hex');
      await fs.writeFile(path.join(directory, key), bytes, { flag: 'wx', mode: 0o600 });
      return { key, size: bytes.length };
    },
    async get(key) {
      validateKey(key);
      return fs.readFile(path.join(directory, key));
    },
    async delete(key) {
      validateKey(key);
      await fs.unlink(path.join(directory, key));
    }
  };
}
module.exports = { createLocalStorage };
