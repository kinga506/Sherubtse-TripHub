const pgp = require('pg-promise')();
const { getConfig } = require('./env');
let connection;

function getDb() {
  if (!connection) {
    const config = getConfig().db;
    connection = pgp({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: true } : false
    });
  }
  return connection;
}

async function testConnection() {
  const result = await getDb().one('SELECT 1 AS connected');
  return result.connected === 1;
}
module.exports = { getDb, testConnection };
