require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const {getDb} = require('../config/db');
const seed = require('../db/seed-data.json');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname,'../db/step22-destination-guides-migration.sql'),'utf8');
  await getDb().tx(async tx => {
    await tx.none(sql);
    let updated = 0;
    for (const destination of seed.destinations) {
      if (!destination.guide_content) throw new Error(`Missing guide content for ${destination.slug}`);
      const result = await tx.result('UPDATE destinations SET guide_content=$2::jsonb WHERE slug=$1',
        [destination.slug,JSON.stringify(destination.guide_content)]);
      if (result.rowCount !== 1) throw new Error(`Expected one existing destination for ${destination.slug}, found ${result.rowCount}`);
      updated += result.rowCount;
    }
    if (updated !== 6) throw new Error(`Expected six destination guides, updated ${updated}`);
  });
  process.stdout.write('Updated the six existing destination guides.\n');
  await getDb().$pool.end();
}

migrate().catch(async error => {
  process.stderr.write(`Destination guide migration failed: ${error.message}\n`);
  try { await getDb().$pool.end(); } catch (_) {}
  process.exitCode = 1;
});
