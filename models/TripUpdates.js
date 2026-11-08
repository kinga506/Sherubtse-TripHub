// Step 13: all trip data queries live in the model; user scope is checked at the route and again on writes.
const {getDb}=require('../config/db');
const {validId}=require('./Access');
function fail(message,status=422){const e=new Error(message);e.status=status;throw e;}
const clean=(v,max)=>String(v??'').trim().slice(0,max+1);
function validateActivity(input){
 const day=Number(input.day_number), title=clean(input.title,160),description=clean(input.description,3000);
 const time=String(input.start_time||'').trim();
 if(!Number.isSafeInteger(day)||day<1||day>365)fail('Day number must be between 1 and 365');
 if(!title||title.length>160||description.length>3000)fail('Enter an activity title (up to 160 characters) and description (up to 3000 characters)');
 if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail('Enter a valid 24-hour time');
 return {day,title,description,time:time||null};
}
function validateNotice(input){const title=clean(input.title,160),body=clean(input.body,5000);
 if(!title||title.length>160||!body||body.length>5000)fail('Announcement title (max 160) and message (max 5000) are required');
 return {title,body,important:input.is_important==='on'||input.is_important===true};
}
async function detail(tripId){return getDb().oneOrNone('SELECT id,title,approval_status,operational_status,is_active,proposed_by_user_id,start_date,end_date FROM trips WHERE id=$1',[tripId]);}
async function activities(tripId){return getDb().any(`SELECT id,day_number,to_char(start_time,'HH24:MI') AS start_time,title,description,is_completed FROM itineraries WHERE trip_id=$1 ORDER BY day_number,start_time NULLS LAST,sort_order,id`,[tripId]);}
async function notices(tripId){return getDb().any(`SELECT a.id,a.title,a.body,a.is_important,a.created_at,u.name AS author_name FROM announcements a JOIN users u ON u.id=a.author_id WHERE a.trip_id=$1 ORDER BY a.is_important DESC,a.created_at DESC,a.id DESC`,[tripId]);}
async function snapshot(tripId){const [trip,itinerary,announcements]=await Promise.all([detail(tripId),activities(tripId),notices(tripId)]);return {trip,itinerary,announcements};}
async function editActivity(tripId,userId,activityId,input){
 const v=validateActivity(input);
 return getDb().tx(async t=>{
  const trip=await t.oneOrNone(`SELECT id,approval_status,operational_status,is_active FROM trips WHERE id=$1 FOR UPDATE`,[tripId]);
  if(!trip||!trip.is_active||trip.approval_status!=='approved'||['completed','cancelled','awaiting_final_report'].includes(trip.operational_status))fail('Trip itinerary is read-only',409);
  if(!await t.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'`,[tripId,userId]))fail('Active Coordinator assignment required',403);
  const previous=activityId?await t.oneOrNone(`SELECT day_number,to_char(start_time,'HH24:MI') AS start_time,title,description FROM itineraries WHERE trip_id=$1 AND id=$2`,[tripId,activityId]):null;
  if(activityId&&!previous)fail('Activity not found',404);
  const changed=!previous||Number(previous.day_number)!==v.day||(previous.start_time||null)!==v.time||previous.title!==v.title||(previous.description||'')!==v.description;
  if(!changed)return {changed:false};
  if(activityId){await t.none(`UPDATE itineraries SET day_number=$3,start_time=$4,title=$5,description=$6 WHERE trip_id=$1 AND id=$2`,[tripId,activityId,v.day,v.time,v.title,v.description]);}
  else await t.none(`INSERT INTO itineraries(trip_id,day_number,start_time,title,description) VALUES($1,$2,$3,$4,$5)`,[tripId,v.day,v.time,v.title,v.description]);
  await resetApproval(t,tripId,userId,activityId?'Operational itinerary changed':'Operational itinerary activity added');
  return {changed:true};
 });
}
async function deleteActivity(tripId,userId,activityId){return getDb().tx(async t=>{
 const trip=await t.oneOrNone('SELECT approval_status,operational_status,is_active FROM trips WHERE id=$1 FOR UPDATE',[tripId]);
 if(!trip||!trip.is_active||trip.approval_status!=='approved'||['completed','cancelled','awaiting_final_report'].includes(trip.operational_status))fail('Trip itinerary is read-only',409);
 if(!await t.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'`,[tripId,userId]))fail('Active Coordinator assignment required',403);
 const result=await t.result('DELETE FROM itineraries WHERE trip_id=$1 AND id=$2',[tripId,activityId]);if(!result.rowCount)fail('Activity not found',404);
 await resetApproval(t,tripId,userId,'Operational itinerary activity removed');
});}
async function resetApproval(t,tripId,userId,reason){
 const trip=await t.one('SELECT * FROM trips WHERE id=$1',[tripId]);
 const itinerary=await t.any(`SELECT day_number,to_char(start_time,'HH24:MI') AS start_time,title,description FROM itineraries WHERE trip_id=$1 ORDER BY day_number,start_time NULLS LAST,sort_order,id`,[tripId]);
 if(!itinerary.length)fail('An approved trip must retain an itinerary. Add a replacement activity before deleting the last one',422);
 const costs=await t.any('SELECT label,amount FROM trip_cost_items WHERE trip_id=$1 ORDER BY sort_order,id',[tripId]);
 const files=await t.any('SELECT id FROM trip_attachments WHERE trip_id=$1 AND is_active=true ORDER BY id',[tripId]);
 const number=await t.one('SELECT COALESCE(MAX(submission_number),0)+1 AS num FROM trip_submissions WHERE trip_id=$1',[tripId]);
 const submission=await t.one(`INSERT INTO trip_submissions(trip_id,submitted_by,submission_number,proposal_snapshot) VALUES($1,$2,$3,$4) RETURNING id`,[tripId,userId,number.num,JSON.stringify({trip,itinerary,costs,attachment_ids:files.map(f=>f.id)})]);
 for(const file of files)await t.none('INSERT INTO trip_submission_attachments(submission_id,attachment_id) VALUES($1,$2)',[submission.id,file.id]);
 await t.none(`UPDATE trips SET approval_status='pending_dsa',registration_open=false,updated_at=NOW() WHERE id=$1`,[tripId]);
 await t.none(`INSERT INTO trip_approval_history(trip_id,submission_id,submitted_by,action,changed_fields,remarks) VALUES($1,$2,$3,'approval_reset',$4,$5)`,[tripId,submission.id,userId,JSON.stringify(['itinerary']),reason]);
 // Snapshot is immutable: DSA reviews the new version, not the prior approved itinerary.
}
async function createNotice(tripId,userId,input){const n=validateNotice(input);return getDb().tx(async t=>{
 const trip=await t.oneOrNone('SELECT approval_status,operational_status,is_active FROM trips WHERE id=$1 FOR UPDATE',[tripId]);
 if(!trip||!trip.is_active||trip.approval_status!=='approved'||['completed','cancelled','awaiting_final_report'].includes(trip.operational_status))fail('Announcements are read-only for this trip',409);
 if(!await t.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'`,[tripId,userId]))fail('Active Coordinator assignment required',403);
 return t.one(`INSERT INTO announcements(trip_id,author_id,title,body,is_important) VALUES($1,$2,$3,$4,$5) RETURNING id`,[tripId,userId,n.title,n.body,n.important]);
});}
module.exports={detail,activities,notices,snapshot,editActivity,deleteActivity,createNotice,validateActivity,validateNotice,fail,validId};
