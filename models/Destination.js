const {getDb} = require('../config/db');
const {PUBLIC_WHERE,BHUTAN_TODAY} = require('./PublicTrip');

// Public destination data is sourced from the seeded, editable database records.
async function getAll() {
  return getDb().any(`SELECT d.id,d.slug,d.name,d.dzongkhag,d.description,d.best_season,
    d.distance_text,d.drive_time_text,d.trek_time_text,d.is_trek,
    d.transport_cost_min,d.transport_cost_max,
    CASE WHEN p.file_path ~ '^[a-f0-9]{32}$' THEN '/managed-photos/'||p.id ELSE p.file_path END AS photo,p.alt_text,p.photo_credit
    FROM destinations d
    LEFT JOIN LATERAL (SELECT id,file_path,alt_text,photo_credit FROM destination_photos
      WHERE destination_id=d.id ORDER BY sort_order,id LIMIT 1) p ON TRUE
    WHERE d.is_active=TRUE ORDER BY d.name`);
}
async function getBySlug(slug) {
  return getDb().oneOrNone(`SELECT d.* FROM destinations d
    WHERE d.slug=$1 AND d.is_active=TRUE`,[slug]);
}
async function getPhotos(destinationId) {
  return getDb().any(`SELECT CASE WHEN file_path ~ '^[a-f0-9]{32}$' THEN '/managed-photos/'||id ELSE file_path END AS file_path,alt_text,photo_credit FROM destination_photos
    WHERE destination_id=$1 ORDER BY sort_order,id`,[destinationId]);
}
async function getPublicTrips(destinationId) {
  return getDb().any(`SELECT t.id,t.title,t.description,t.start_date,t.end_date,t.estimated_cost,
    t.registration_open,t.vacancies_held_closed,t.registration_deadline,t.is_sample,t.max_participants,
    CASE WHEN t.start_date > ${BHUTAN_TODAY} THEN 'upcoming' ELSE 'ongoing' END AS public_stage,
    COUNT(p.id) FILTER (WHERE p.status IN ('pending','approved'))::int AS occupied_seats,
    COUNT(p.id) FILTER (WHERE p.status='approved')::int AS confirmed_participants
    FROM trips t
    JOIN destinations d ON d.id=t.destination_id
    LEFT JOIN participants p ON p.trip_id=t.id
    WHERE t.destination_id=$1 AND ${PUBLIC_WHERE}
    GROUP BY t.id ORDER BY t.start_date,t.id`,[destinationId]);
}
module.exports={getAll,getBySlug,getPhotos,getPublicTrips};
