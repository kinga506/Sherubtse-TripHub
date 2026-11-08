// All authorization lookups are parameterised and scoped to the signed-in user.
const {getDb} = require('../config/db');

const validId = value => /^(?:[1-9][0-9]*)$/.test(String(value || '')) && Number.isSafeInteger(Number(value));

async function tripById(tripId) {
  return getDb().oneOrNone('SELECT id, proposed_by_user_id, approval_status, operational_status, is_active FROM trips WHERE id=$1', [tripId]);
}
async function activeAssignment(tripId,userId) {
  return getDb().oneOrNone(`SELECT id,assignment_role FROM trip_coordinators
    WHERE trip_id=$1 AND user_id=$2 AND status='active'`, [tripId,userId]);
}
async function historicalAssignment(tripId,userId) {
  return getDb().oneOrNone(`SELECT id,assignment_role FROM trip_coordinators
    WHERE trip_id=$1 AND user_id=$2 ORDER BY assigned_at DESC,id DESC LIMIT 1`, [tripId,userId]);
}
async function approvedParticipation(tripId,userId) {
  return getDb().oneOrNone(`SELECT id FROM participants WHERE trip_id=$1 AND user_id=$2 AND status='approved'`, [tripId,userId]);
}
async function coordinatingTripIds(userId) {
  return getDb().any(`SELECT DISTINCT t.id,t.title,c.assignment_role FROM trip_coordinators c
    JOIN trips t ON t.id=c.trip_id
    WHERE c.user_id=$1 AND c.status='active' AND t.is_active=true
    AND t.operational_status NOT IN ('completed','cancelled') ORDER BY t.title,t.id`,[userId]);
}
module.exports={validId,tripById,activeAssignment,historicalAssignment,approvedParticipation,coordinatingTripIds};
