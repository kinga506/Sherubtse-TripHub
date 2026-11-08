
require('dotenv').config();

const bcrypt = require('bcrypt');
const { getDb } = require('../config/db');

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local bootstrap cannot run in production.');
  }

  const name = process.env.BOOTSTRAP_ADMIN_NAME;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error('Missing bootstrap account settings.');
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 12 ||
    Buffer.byteLength(password) > 72
  ) {
    throw new Error('Invalid email or password length.');
  }

  const db = getDb();
  const hash = await bcrypt.hash(password, 12);

  await db.tx(async function (t) {
    await t.one(
      'SELECT pg_advisory_xact_lock($1) AS locked',
      [873421]
    );

    const existing = await t.one(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE role = 'admin'
    `);

    if (existing.count > 0) {
      throw new Error('Superadmin already exists. Bootstrap stopped.');
    }

    await t.none(`
      INSERT INTO users
        (name, email, password_hash, role, is_verified, is_active)
      VALUES
        ($1, $2, $3, 'admin', TRUE, TRUE)
    `, [name, email.toLowerCase(), hash]);
  });

  console.log('Superadmin account created successfully.');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Bootstrap failed:', error.message);
    process.exit(1);
  });
