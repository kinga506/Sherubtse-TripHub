const bcrypt = require('bcrypt');

const LOCK_KEY = 873421;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;

function neonHostname(value) {
  const host = String(value || '').trim().toLowerCase().replace(/\.$/, '');
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.neon\.tech$/.test(host)) {
    throw new Error('The configured database host is not a Neon hostname.');
  }
  return host;
}

function validateInput({ name, email, password, passwordConfirmation }) {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanName || cleanName.length > 100) throw new Error('Enter a name of 1–100 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Enter a valid email address.');
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH || Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new Error('Password must be at least 12 characters and no more than 72 UTF-8 bytes.');
  }
  if (password !== passwordConfirmation) throw new Error('The passwords do not match.');
  return { name: cleanName, email: cleanEmail };
}

async function bootstrapInitialSuperadmin({ db, host, confirmation, name, email, password, passwordConfirmation }) {
  const checkedHost = neonHostname(host);
  if (confirmation !== `PROVISION INITIAL SUPERADMIN ON ${checkedHost}`) {
    throw new Error('Production target confirmation did not match.');
  }
  const account = validateInput({ name, email, password, passwordConfirmation });

  return db.tx(async transaction => {
    await transaction.one('SELECT pg_advisory_xact_lock($1) AS locked', [LOCK_KEY]);

    const existingEmail = await transaction.oneOrNone(
      'SELECT id FROM users WHERE LOWER(email)=LOWER($1)', [account.email]
    );
    if (existingEmail) throw new Error('An account already uses that email. No account was changed.');

    const activeAdmins = await transaction.one(
      "SELECT COUNT(*)::int AS count FROM users WHERE role='admin' AND is_active=TRUE"
    );
    if (Number(activeAdmins.count) > 0) {
      throw new Error('An active Superadmin already exists. No account was created.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await transaction.none(`INSERT INTO users
      (name,email,password_hash,role,is_verified,is_active)
      VALUES($1,$2,$3,'admin',TRUE,TRUE)`, [account.name, account.email, passwordHash]);
    return { created: true };
  });
}

module.exports = { bootstrapInitialSuperadmin, neonHostname, validateInput };
