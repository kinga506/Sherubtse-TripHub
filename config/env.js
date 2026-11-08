
const path = require('node:path');

function isPlaceholder(value) {
  if (!value) return true;

  return /REPLACE|PLACEHOLDER|EXAMPLE|YOUR_|CHANGEME|DUMMY|TEST_ONLY/i.test(value) ||
    /example\.(?:invalid|com)$/i.test(value);
}

function required(name, env) {
  const value = String(env[name] || '').trim();

  if (isPlaceholder(value)) {
    throw new Error(
      `${name} must be configured with a real value`
    );
  }

  return value;
}

function getConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error(
      'NODE_ENV must be development, test or production'
    );
  }

  const port = Number(env.PORT || 3000);

  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid port number');
  }

  const dbPort = Number(env.DB_PORT || 5432);

  if (!Number.isSafeInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error('DB_PORT must be a valid port number');
  }

  const sslValue = env.DB_SSL || 'false';

  if (!['true', 'false'].includes(sslValue)) {
    throw new Error('DB_SSL must be true or false');
  }

  const mongoValue = env.ENABLE_MONGODB === undefined
    ? 'true'
    : env.ENABLE_MONGODB;

  if (!['true', 'false'].includes(mongoValue)) {
    throw new Error('ENABLE_MONGODB must be true or false');
  }

  const storageMode = env.STORAGE_MODE || 'local';

  if (!['local', 'r2'].includes(storageMode)) {
    throw new Error('STORAGE_MODE must be local or r2');
  }

  const emailMode = env.EMAIL_MODE || 'log';

  if (!['log', 'smtp', 'api'].includes(emailMode)) {
    throw new Error('EMAIL_MODE must be log, smtp or api');
  }

  const temporaryStorage =
    env.ALLOW_EPHEMERAL_STORAGE === 'true';

  if (
    env.ALLOW_EPHEMERAL_STORAGE &&
    !['true', 'false'].includes(env.ALLOW_EPHEMERAL_STORAGE)
  ) {
    throw new Error(
      'ALLOW_EPHEMERAL_STORAGE must be true or false'
    );
  }

  const config = {
    nodeEnv,
    port,
    enableMongo: mongoValue === 'true',

    appUrl: env.APP_URL || `http://localhost:${port}`,

    db: {
      host: env.DB_HOST || 'localhost',
      port: dbPort,
      database: env.DB_NAME || 'sherubtse_triphub',
      user: env.DB_USER || 'postgres',
      // Keep the password byte-for-byte: spaces and punctuation can be valid
      // password characters, and pg-promise receives it as a separate value.
      password: env.DB_PASS || '',
      ssl: sslValue === 'true'
    },

    emailMode,
    emailProvider: env.EMAIL_PROVIDER || 'resend',

    storageMode,
    temporaryStorage,

    localUploadDir: path.resolve(
      __dirname,
      '..',
      env.LOCAL_UPLOAD_DIR || 'private_uploads'
    ),

    r2: {
      accountId: env.R2_ACCOUNT_ID || '',
      bucket: env.R2_BUCKET || '',
      accessKeyId: env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: env.R2_SECRET_ACCESS_KEY || ''
    },

    allowedEmailSuffix:
      env.ALLOWED_EMAIL_SUFFIX || '.sherubtse@rub.edu.bt'
  };

  if (nodeEnv === 'production') {

    if (emailMode !== 'api') {
      throw new Error(
        'Production requires EMAIL_MODE=api'
      );
    }

    if (config.emailProvider !== 'resend') {
      throw new Error(
        'Production email provider must be resend'
      );
    }

    if (storageMode === 'local' && !temporaryStorage) {
      throw new Error(
        'Production requires private R2 storage unless ALLOW_EPHEMERAL_STORAGE=true is explicitly set for a controlled test deployment'
      );
    }

    if (storageMode === 'local' && temporaryStorage) {
      console.warn(
        '[DEMO WARNING] Temporary local storage enabled. ' +
        'Uploaded files may be lost on restart or redeployment. ' +
        'Do not store real student information or consent letters.'
      );
    }

    const productionKeys = [
      'DB_HOST',
      'DB_NAME',
      'DB_USER',
      'DB_PASS',
      'SESSION_SECRET',
      'APP_URL',
      'EMAIL_API_KEY',
      'EMAIL_FROM'
    ];

    if (config.enableMongo) productionKeys.push('MONGO_URI');

    for (const key of productionKeys) {
      required(key, env);
    }

    if ((env.SESSION_SECRET || '').length < 32) {
      throw new Error(
        'SESSION_SECRET must be at least 32 characters'
      );
    }

    if (!config.appUrl.startsWith('https://')) {
      throw new Error(
        'Production APP_URL must use HTTPS'
      );
    }

    if (env.DEMO_MODE === 'true') {
      throw new Error(
        'Production DEMO_MODE must be false'
      );
    }
  }

  if (storageMode === 'r2') {
    const r2Keys = [
      'R2_ACCOUNT_ID',
      'R2_BUCKET',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY'
    ];

    for (const key of r2Keys) {
      required(key, env);
    }
  }

  return config;
}

module.exports = { getConfig };
