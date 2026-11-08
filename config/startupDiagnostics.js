const POSTGRES_MESSAGES = {
  '28P01': 'password authentication failed; verify the Neon role password',
  '28000': 'PostgreSQL authentication configuration was rejected',
  '3D000': 'the configured PostgreSQL database does not exist',
  '42501': 'the PostgreSQL role lacks required database permissions',
  '08001': 'could not establish a PostgreSQL connection',
  '08006': 'the PostgreSQL connection was lost'
};

function safeCode(code) {
  if (typeof code === 'number' && Number.isFinite(code)) return String(code);
  return typeof code === 'string' && /^[A-Z0-9_-]{1,16}$/i.test(code)
    ? code
    : null;
}

function postgresFailure(error) {
  const code = safeCode(error && error.code);
  const message = POSTGRES_MESSAGES[code] || 'connection attempt failed';
  return `${code ? `code ${code}: ` : ''}${message}`;
}

function mongoFailure(error) {
  const code = safeCode(error && (error.codeName || error.code));
  const message = code === 'AuthenticationFailed' || code === '18'
    ? 'MongoDB authentication failed; verify the Atlas database user and password'
    : code === 'ENOTFOUND' || code === 'ECONNREFUSED'
      ? 'could not reach MongoDB Atlas; verify the hostname and network access'
      : 'connection attempt failed; verify the Atlas URI and network access';
  return `${code ? `code ${code}: ` : ''}${message}`;
}

module.exports = { postgresFailure, mongoFailure };
