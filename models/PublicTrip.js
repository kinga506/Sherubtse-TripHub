const {getDb} = require('../config/db');

// Central public visibility predicate: never expose draft or unassigned proposals.
const PUBLIC_WHERE = `t.approval_status='approved' AND t.is_active=TRUE
  AND t.operational_status='planned' AND t.start_date >= CURRENT_DATE
  AND EXISTS (SELECT 1 FROM trip_coordinators c WHERE c.trip_id=t.id
    AND c.status='active' AND c.assignment_role='lead')`;
const TRIP_COLUMNS = `t.id,t.title,t.description,t.purpose,t.start_date,t.end_date,
  t.meeting_point,t.meeting_time,t.transport_information,t.safety_information,
  t.emergency_contact_name,t.emergency_contact_phone,t.registration_deadline,
  t.registration_open,t.vacancies_held_closed,t.max_participants,t.estimated_cost,
  t.estimated_budget_note,t.is_sample,d.name AS destination_name,d.slug AS destination_slug,
  d.dzongkhag,d.practical_tip,d.travel_note,d.is_trek,
  COALESCE((SELECT SUM(CASE WHEN p.status IN ('pending','approved') THEN 1 ELSE 0 END)::int
    FROM participants p WHERE p.trip_id=t.id),0) AS occupied_seats,
  COALESCE((SELECT COUNT(*)::int FROM participants p WHERE p.trip_id=t.id AND p.status='approved'),0) AS confirmed_participants,
  (SELECT CASE WHEN dp.file_path ~ '^[a-f0-9]{32}$' THEN '/managed-photos/'||dp.id ELSE dp.file_path END FROM destination_photos dp WHERE dp.destination_id=t.destination_id
    ORDER BY dp.sort_order,dp.id LIMIT 1) AS destination_photo`;

function cleanFilters(raw={}) {
 const q=typeof raw.q==='string'?raw.q.trim().slice(0,100):'';
 const dzongkhag=typeof raw.dzongkhag==='string' && /^[a-zA-Z ]{1,60}$/.test(raw.dzongkhag)?raw.dzongkhag:'';
 const registration=['all','open','closed'].includes(raw.registration)?raw.registration:'all';
 const sort=['soonest','cost_low','cost_high'].includes(raw.sort)?raw.sort:'soonest';
 return {q,dzongkhag,registration,sort};
}
async function list(filters={}) {
 const f=cleanFilters(filters);
 const params=[];
 const clauses=[PUBLIC_WHERE];
 if(f.q){params.push(`%${f.q}%`);clauses.push(`(t.title ILIKE $${params.length} OR d.name ILIKE $${params.length})`);}
 if(f.dzongkhag){params.push(f.dzongkhag);clauses.push(`d.dzongkhag=$${params.length}`);}
 if(f.registration==='open') clauses.push(`t.registration_open=TRUE AND t.vacancies_held_closed=FALSE AND t.registration_deadline >= NOW() AND
    (SELECT COUNT(*) FROM participants p WHERE p.trip_id=t.id AND p.status IN ('pending','approved')) < t.max_participants`);
 if(f.registration==='closed') clauses.push(`NOT(t.registration_open=TRUE AND t.vacancies_held_closed=FALSE AND t.registration_deadline >= NOW() AND
    (SELECT COUNT(*) FROM participants p WHERE p.trip_id=t.id AND p.status IN ('pending','approved')) < t.max_participants)`);
 const order={soonest:'t.start_date ASC,t.id ASC',cost_low:'t.estimated_cost ASC,t.start_date ASC,t.id ASC',cost_high:'t.estimated_cost DESC,t.start_date ASC,t.id ASC'}[f.sort];
 return getDb().any(`SELECT ${TRIP_COLUMNS} FROM trips t JOIN destinations d ON d.id=t.destination_id
   WHERE ${clauses.join(' AND ')} ORDER BY ${order} LIMIT 100`,params);
}
async function getById(id){
 return getDb().oneOrNone(`SELECT ${TRIP_COLUMNS} FROM trips t JOIN destinations d ON d.id=t.destination_id
   WHERE t.id=$1 AND ${PUBLIC_WHERE}`,[id]);
}
async function getCostItems(tripId){
 return getDb().any(`SELECT label,amount FROM trip_cost_items WHERE trip_id=$1 ORDER BY sort_order,id`,[tripId]);
}
async function getDzongkhags(){
 return getDb().manyOrNone(`SELECT DISTINCT d.dzongkhag FROM destinations d JOIN trips t ON t.destination_id=d.id
  WHERE ${PUBLIC_WHERE} ORDER BY d.dzongkhag`);
}
module.exports={PUBLIC_WHERE,TRIP_COLUMNS,cleanFilters,list,getById,getCostItems,getDzongkhags};
