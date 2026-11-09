const {getDb} = require('../config/db');

const BHUTAN_TODAY = `(NOW() AT TIME ZONE 'Asia/Thimphu')::date`;

// One predicate is shared by public listings, details, destination trip cards and REST.
const PUBLIC_WHERE = `t.approval_status='approved' AND t.is_active=TRUE AND t.is_sample=FALSE
  AND t.operational_status IN ('planned','ongoing') AND t.end_date >= ${BHUTAN_TODAY}
  AND t.is_publicly_hidden=FALSE AND d.is_active=TRUE
  AND EXISTS (SELECT 1 FROM trip_coordinators c WHERE c.trip_id=t.id
    AND c.status='active' AND c.assignment_role='lead')`;

const TRIP_COLUMNS = `t.id,t.title,t.description,t.purpose,t.start_date,t.end_date,
  t.meeting_point,t.meeting_time,t.transport_information,t.safety_information,
  t.emergency_contact_name,t.emergency_contact_phone,t.registration_deadline,
  t.registration_open,t.vacancies_held_closed,t.max_participants,t.estimated_cost,
  t.estimated_budget_note,t.is_sample,
  CASE WHEN t.start_date > ${BHUTAN_TODAY} THEN 'upcoming' ELSE 'ongoing' END AS public_stage,
  d.name AS destination_name,d.slug AS destination_slug,
  d.dzongkhag,d.practical_tip,d.travel_note,d.is_trek,
  COALESCE((SELECT SUM(CASE WHEN p.status IN ('pending','approved') THEN 1 ELSE 0 END)::int
    FROM participants p WHERE p.trip_id=t.id),0) AS occupied_seats,
  COALESCE((SELECT COUNT(*)::int FROM participants p WHERE p.trip_id=t.id AND p.status='approved'),0) AS confirmed_participants,
  (SELECT CASE WHEN dp.file_path ~ '^[a-f0-9]{32}$' THEN '/managed-photos/'||dp.id ELSE dp.file_path END FROM destination_photos dp WHERE dp.destination_id=t.destination_id
    ORDER BY dp.sort_order,dp.id LIMIT 1) AS destination_photo`;

function bhutanDate(now=new Date()) {
 const parts=new Intl.DateTimeFormat('en',{
  timeZone:'Asia/Thimphu',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(now);
 const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
 return `${value.year}-${value.month}-${value.day}`;
}
function dateOnly(value) {
 if(value instanceof Date)return value.toISOString().slice(0,10);
 return String(value||'').slice(0,10);
}
function isPublicEligible(trip,today=bhutanDate(),allowHidden=false) {
 return Boolean(trip && trip.approval_status==='approved' && trip.is_active===true &&
  trip.is_sample!==true && ['planned','ongoing'].includes(trip.operational_status) &&
  (allowHidden || trip.is_publicly_hidden!==true) && trip.has_active_lead===true &&
  dateOnly(trip.end_date)>=today);
}
function visibilityInfo(trip,today=bhutanDate()) {
 const eligible=isPublicEligible(trip,today,true);
 const stage=dateOnly(trip.start_date)>today?'upcoming':'ongoing';
 let state='not_eligible',label='Not eligible for public display';
 if(trip.operational_status==='completed') {state='completed';label='Completed';}
 else if(trip.operational_status==='cancelled') {state='cancelled';label='Cancelled';}
 else if(trip.is_publicly_hidden===true) {state='hidden';label='Hidden by coordinator';}
 else if(eligible) {state='public';label=stage==='upcoming'?'Public — Upcoming':'Public — Ongoing';}
 return {public_visibility_state:state,public_visibility_label:label,public_eligible:eligible,public_stage:eligible?stage:null};
}
async function list() {
 return getDb().any(`SELECT ${TRIP_COLUMNS} FROM trips t JOIN destinations d ON d.id=t.destination_id
   WHERE ${PUBLIC_WHERE} ORDER BY t.start_date ASC,t.id ASC LIMIT 100`);
}
async function getById(id) {
 return getDb().oneOrNone(`SELECT ${TRIP_COLUMNS} FROM trips t JOIN destinations d ON d.id=t.destination_id
   WHERE t.id=$1 AND ${PUBLIC_WHERE}`,[id]);
}
async function getCostItems(tripId) {
 return getDb().any(`SELECT label,amount FROM trip_cost_items WHERE trip_id=$1 ORDER BY sort_order,id`,[tripId]);
}
async function setVisibility(tripId,userId,hidden,reason='') {
 if(typeof hidden!=='boolean')throw Object.assign(new Error('Invalid visibility action'),{status:422});
 const note=String(reason||'').trim();
 if(note.length>500)throw Object.assign(new Error('Reason must be 500 characters or fewer'),{status:422});
 return getDb().tx(async t=>{
  const trip=await t.oneOrNone('SELECT * FROM trips WHERE id=$1 FOR UPDATE',[tripId]);
  if(!trip)throw Object.assign(new Error('Trip not found'),{status:404});
  const assignment=await t.oneOrNone(`SELECT id FROM trip_coordinators
    WHERE trip_id=$1 AND user_id=$2 AND status='active' AND assignment_role='lead' FOR UPDATE`,[tripId,userId]);
  if(!assignment)throw Object.assign(new Error('Active lead Coordinator assignment required'),{status:403});
  const lead=await t.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1
    AND status='active' AND assignment_role='lead' LIMIT 1`,[tripId]);
  const eligible=isPublicEligible({...trip,has_active_lead:Boolean(lead)},bhutanDate(),true);
  if(!eligible)throw Object.assign(new Error('This trip is not eligible for public display'),{status:409});
  if(Boolean(trip.is_publicly_hidden)===hidden)return {hidden,changed:false};
  await t.none('UPDATE trips SET is_publicly_hidden=$1,updated_at=NOW() WHERE id=$2',[hidden,tripId]);
  await t.none(`INSERT INTO trip_public_visibility_events(trip_id,actor_id,action,reason)
    VALUES($1,$2,$3,$4)`,[tripId,userId,hidden?'hide':'show',note||null]);
  return {hidden,changed:true};
 });
}
async function dsaVisibilityOverview() {
 return getDb().any(`SELECT t.id,t.title,t.approval_status,t.operational_status,t.is_active,t.is_sample,
   t.is_publicly_hidden,t.start_date,t.end_date,lead.id AS lead_user_id,lead.name AS lead_name,
   report.id AS report_id,report.submitted_at,
   COALESCE((SELECT json_agg(json_build_object('action',e.action,'reason',e.reason,
     'created_at',e.created_at,'actor_name',actor.name) ORDER BY e.created_at DESC,e.id DESC)
     FROM trip_public_visibility_events e LEFT JOIN users actor ON actor.id=e.actor_id
     WHERE e.trip_id=t.id),'[]'::json) AS visibility_history
   FROM trips t LEFT JOIN trip_final_reports report ON report.trip_id=t.id
   LEFT JOIN LATERAL (SELECT u.id,u.name FROM trip_coordinators c JOIN users u ON u.id=c.user_id
     WHERE c.trip_id=t.id AND c.status='active' AND c.assignment_role='lead' LIMIT 1) lead ON TRUE
   WHERE t.approval_status='approved' ORDER BY t.end_date DESC,t.id DESC LIMIT 150`);
}
module.exports={BHUTAN_TODAY,TRIP_COLUMNS,PUBLIC_WHERE,bhutanDate,dateOnly,isPublicEligible,visibilityInfo,list,getById,getCostItems,setVisibility,dsaVisibilityOverview};
