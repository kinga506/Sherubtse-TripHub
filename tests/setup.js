const dotenv = require('dotenv');
const path = require('path');

dotenv.config({
    path: path.join(__dirname, '..', '.env.test')
});

process.env.NODE_ENV = 'test';

process.env.SESSION_SECRET =
    'test_only_secret_abcdefghijklmnopqrstuvwxyz012345';