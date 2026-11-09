const dotenv = require('dotenv');
const path = require('path');

dotenv.config({
    path: path.join(__dirname, '..', '.env.test'),
    override: true
});

process.env.NODE_ENV = 'test';
// Tests use local email delivery unless a test explicitly exercises a provider.
// This keeps the suite independent of credentials in a developer's .env file.
process.env.EMAIL_MODE = 'log';

process.env.SESSION_SECRET =
    'test_only_secret_abcdefghijklmnopqrstuvwxyz012345';
