const bcrypt = require('bcrypt');
const { bootstrapInitialSuperadmin, neonHostname, validateInput } = require('../services/initialSuperadminBootstrap');

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('bcrypt-hash') }));

const host = 'ep-project-region.aws.neon.tech';
const confirmation = `PROVISION INITIAL SUPERADMIN ON ${host}`;
const input = {
  db: null, host, confirmation, name: 'TripHub Administrator', email: 'Admin@Example.edu',
  password: 'a-strong-password-123', passwordConfirmation: 'a-strong-password-123'
};

function mockDb({ existingEmail = null, activeAdmins = 0 } = {}) {
  const transaction = {
    one: jest.fn(async query => query.includes('pg_advisory') ? { locked: true } : { count: activeAdmins }),
    oneOrNone: jest.fn().mockResolvedValue(existingEmail),
    none: jest.fn().mockResolvedValue(undefined)
  };
  return { db: { tx: jest.fn(callback => callback(transaction)) }, transaction };
}

beforeEach(() => jest.clearAllMocks());

test('accepts only a hostname beneath neon.tech', () => {
  expect(neonHostname('ep-project-region.aws.neon.tech')).toBe(host);
  expect(() => neonHostname('localhost')).toThrow('not a Neon hostname');
  expect(() => neonHostname('neon.tech.attacker.example')).toThrow('not a Neon hostname');
});

test('enforces the existing account name, email and password policy', () => {
  expect(validateInput(input)).toEqual({ name: input.name, email: 'admin@example.edu' });
  expect(() => validateInput({ ...input, password: 'short' })).toThrow('at least 12 characters');
  expect(() => validateInput({ ...input, password: 'a'.repeat(73) })).toThrow('72 UTF-8 bytes');
  expect(() => validateInput({ ...input, passwordConfirmation: 'different-password' })).toThrow('do not match');
});

test('refuses every existing email account without changing it', async () => {
  const { db, transaction } = mockDb({ existingEmail: { id: 4 } });
  await expect(bootstrapInitialSuperadmin({ ...input, db })).rejects.toThrow('An account already uses that email');
  expect(transaction.one).toHaveBeenCalledTimes(1); // advisory lock only
  expect(transaction.none).not.toHaveBeenCalled();
  expect(bcrypt.hash).not.toHaveBeenCalled();
});

test('refuses a second bootstrap when an active admin exists', async () => {
  const { db, transaction } = mockDb({ activeAdmins: 1 });
  await expect(bootstrapInitialSuperadmin({ ...input, db })).rejects.toThrow('An active Superadmin already exists');
  expect(transaction.oneOrNone).toHaveBeenCalledWith(
    'SELECT id FROM users WHERE LOWER(email)=LOWER($1)', ['admin@example.edu']
  );
  expect(transaction.none).not.toHaveBeenCalled();
  expect(bcrypt.hash).not.toHaveBeenCalled();
});

test('creates exactly one verified active admin using a fresh bcrypt hash in a locked transaction', async () => {
  const { db, transaction } = mockDb();
  await expect(bootstrapInitialSuperadmin({ ...input, db })).resolves.toEqual({ created: true });
  expect(db.tx).toHaveBeenCalledTimes(1);
  expect(transaction.one).toHaveBeenNthCalledWith(1, 'SELECT pg_advisory_xact_lock($1) AS locked', [873421]);
  expect(bcrypt.hash).toHaveBeenCalledWith(input.password, 12);
  expect(transaction.none).toHaveBeenCalledWith(expect.stringContaining("VALUES($1,$2,$3,'admin',TRUE,TRUE)"), [
    input.name, 'admin@example.edu', 'bcrypt-hash'
  ]);
});

test('requires exact Neon host confirmation before opening a transaction', async () => {
  const { db } = mockDb();
  await expect(bootstrapInitialSuperadmin({ ...input, db, confirmation: 'yes' })).rejects.toThrow('confirmation did not match');
  expect(db.tx).not.toHaveBeenCalled();
});
