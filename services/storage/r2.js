const crypto = require('node:crypto');

function createR2Storage(config) {
  // Credentials are validated by config/env.js before constructing this adapter.
  // Object keys are opaque; controllers must check user authorization before calling get().
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  });
  const bucket = config.bucket;
  function validateKey(key) {
    if (!/^[a-f0-9]{32}$/.test(key)) throw new Error('Invalid private object key');
  }
  return {
    async put(bytes, contentType = 'application/octet-stream') {
      if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new Error('Nonempty Buffer required');
      const key = crypto.randomBytes(16).toString('hex');
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }));
      return { key, size: bytes.length };
    },
    async get(key) {
      validateKey(key);
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return Buffer.from(await result.Body.transformToByteArray());
    },
    async delete(key) {
      validateKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    }
  };
}
module.exports = { createR2Storage };
