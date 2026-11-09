const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_SLUGS = [
  'chorten-kora','bumdeling','merak-village','sakteng-village','dangling-tsho','takila'
];
const DESTINATION_COLUMNS = [
  'name','slug','dzongkhag','description','best_season','transport',
  'transport_cost_min','transport_cost_max','entry_fee_note','distance_text',
  'drive_time_text','trek_time_text','travel_note','practical_tip','is_trek'
];

function verifySource(seedDestinations) {
  if (!Array.isArray(seedDestinations) || seedDestinations.length !== EXPECTED_SLUGS.length) {
    throw new Error('Destination source must contain exactly six records.');
  }
  const actual = seedDestinations.map(destination => destination.slug);
  if (new Set(actual).size !== EXPECTED_SLUGS.length || EXPECTED_SLUGS.some(slug => !actual.includes(slug))) {
    throw new Error('Destination source must contain the six expected slugs.');
  }
}

function verifyPhotoFile(destination, imageRoot) {
  const prefix = '/images/destinations/';
  const photo = destination.photo;
  if (typeof photo !== 'string' || !photo.startsWith(prefix) || path.posix.basename(photo) !== photo.slice(prefix.length)) {
    throw new Error(`Invalid destination photo path for ${destination.slug}.`);
  }
  const root = fs.realpathSync(imageRoot);
  const actualPath = fs.realpathSync(path.resolve(root, path.posix.basename(photo)));
  const relative = path.relative(root, actualPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(actualPath).isFile()) {
    throw new Error(`Destination photo is outside the image folder or is not a file: ${photo}`);
  }
  return photo;
}

function sameValue(field, actual, expected) {
  if (field === 'transport_cost_min' || field === 'transport_cost_max') {
    if (actual === null || actual === undefined || expected === null || expected === undefined) {
      return (actual === null || actual === undefined) && (expected === null || expected === undefined);
    }
    return Number(actual) === Number(expected);
  }
  return actual === expected;
}

async function initializeDestinations({db, seedDestinations, imageRoot}) {
  verifySource(seedDestinations);
  for (const destination of seedDestinations) verifyPhotoFile(destination, imageRoot);

  const slugs = EXPECTED_SLUGS;
  return db.tx(async tx => {
    for (const destination of seedDestinations) {
      const values = DESTINATION_COLUMNS.map(column => destination[column]);
      await tx.none(`INSERT INTO destinations(${DESTINATION_COLUMNS.join(',')})
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT(slug) DO NOTHING`, values);
    }

    const rows = await tx.any(`SELECT id,${DESTINATION_COLUMNS.join(',')} FROM destinations WHERE slug IN ($1:csv)`,[slugs]);
    if (rows.length !== EXPECTED_SLUGS.length) {
      throw new Error(`Expected six destination slugs after initialization; found ${rows.length}.`);
    }
    const bySlug = new Map(rows.map(row => [row.slug,row]));
    for (const destination of seedDestinations) {
      const row = bySlug.get(destination.slug);
      if (!row) throw new Error(`Destination ${destination.slug} was not created.`);
      const mismatched = DESTINATION_COLUMNS.find(column => !sameValue(column,row[column],destination[column]));
      if (mismatched) {
        throw new Error(`Existing destination ${destination.slug} differs from the source in ${mismatched}; no records were overwritten.`);
      }

      const photo = destination.photo;
      await tx.none(`INSERT INTO destination_photos(destination_id,file_path,alt_text,photo_credit)
        VALUES($1,$2,$3,$4) ON CONFLICT(file_path) DO NOTHING`,
      [row.id,photo,`Supplied photograph: ${destination.name}`,null]);
      const photoRow = await tx.oneOrNone('SELECT destination_id,file_path FROM destination_photos WHERE file_path=$1',[photo]);
      if (!photoRow || Number(photoRow.destination_id) !== Number(row.id) || photoRow.file_path !== photo) {
        throw new Error(`Destination photo reference is missing or belongs to a different destination: ${photo}`);
      }
    }
    return {destinationCount:rows.length,photoCount:seedDestinations.length};
  });
}

module.exports = {EXPECTED_SLUGS,initializeDestinations};
