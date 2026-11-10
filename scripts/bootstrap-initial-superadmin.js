require('dotenv').config();

const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { getConfig } = require('../config/env');
const { getDb } = require('../config/db');
const { bootstrapInitialSuperadmin, neonHostname } = require('../services/initialSuperadminBootstrap');

function ask(rl, prompt) {
  return rl.question(prompt);
}

async function askHidden(prompt) {
  stdout.write(prompt);
  const originalRawMode = stdin.isTTY && stdin.isRaw;
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('A local interactive terminal is required to enter the password securely.');
  }

  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(Boolean(originalRawMode));
      stdout.write('\n');
    };
    const onData = buffer => {
      for (const character of buffer.toString('utf8')) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Password entry cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= ' ') value += character;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const host = neonHostname(getConfig().db.host);
  console.log(`Configured Neon database hostname: ${host}`);
  console.log('This command creates only one initial Superadmin. It does not create or update other accounts.');
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const confirmation = await ask(rl, `Type exactly: PROVISION INITIAL SUPERADMIN ON ${host}\n> `);
    const name = await ask(rl, 'Superadmin name: ');
    const email = await ask(rl, 'Superadmin email: ');
    rl.close();
    const password = await askHidden('Password (input hidden): ');
    const passwordConfirmation = await askHidden('Confirm password (input hidden): ');
    const result = await bootstrapInitialSuperadmin({
      db: getDb(), host, confirmation, name, email, password, passwordConfirmation
    });
    if (result.created) console.log('Initial Superadmin account created. Sign in through the application login page.');
  } finally {
    rl.close();
  }
}

main().catch(error => {
  const safeMessages = new Set([
    'The configured database host is not a Neon hostname.',
    'Production target confirmation did not match.',
    'Enter a name of 1–100 characters.',
    'Enter a valid email address.',
    'Password must be at least 12 characters and no more than 72 UTF-8 bytes.',
    'The passwords do not match.',
    'An account already uses that email. No account was changed.',
    'An active Superadmin already exists. No account was created.',
    'A local interactive terminal is required to enter the password securely.',
    'Password entry cancelled.'
  ]);
  console.error(safeMessages.has(error.message) ? error.message : 'Bootstrap failed. Check database connectivity and schema; secret values were not logged.');
  process.exitCode = 1;
});
