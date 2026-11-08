const {getDb}=require('../config/db');
const {getMongo}=require('../config/mongo');
const {validId}=require('./Access');
const {sendEmail}=require('../services/mailer');
const TZ_DAY="(NOW() AT TIME ZONE 'Asia/Thimphu')::date";
function fail(message,status=422){const error=new Error(message);error.status=status;throw error;}
const text=(s,max=3000)=>typeof s==='string'?s.trim().slice(0,max):'';
function validateReport(input){
 const incident=text(input.incident_report,3000);
 if(!incident)fail('Describe any incidents, or explicitly state that none were reported');
 if(String(input.incident_report||'').trim().length>3000)fail('Incident report is too long');
 if(String(input.additional_notes||'').length>3000)fail('Closing notes are too long');
 return {incident,notes:text(input.additional_notes,3000)};
}
async function feedbackSnapshot(tripId){
 // One read of MongoDB is frozen into PostgreSQL with the final report.
 const entries=await getMongo().collection('feedback').find({tripId:Number(tripId)},
  {projection:{_id:0,rating:1,comment:1,createdAt:1}}).toArray();
 const count=entries.length;
 const average=count?Number((entries.reduce((sum,e)=>sum+Number(e.rating),0)/count).toFixed(2)):null;
 const summary=count?`${count} review(s) received; mean rating ${average}/5. Feedback recorded at submission time.`:'No student feedback had been received when this report was submitted.';
 return {count,average,summary,entries:entries.map(e=>({rating:e.rating,comment:e.comment,createdAt:e.createdAt}))};
}
async function detail(tripId){
 if(!validId(tripId))fail('Invalid trip ID',400);
 const db=getDb();
 const [trip,report,events,lead]=await Promise.all([
  db.oneOrNone('SELECT * FROM trips WHERE id=$1',[tripId]),
  db.oneOrNone('SELECT r.*,u.name AS submitted_by_name FROM trip_final_reports r JOIN users u ON u.id=r.submitted_by WHERE r.trip_id=$1',[tripId]),
  db.any('SELECT e.*,u.name AS actor_name FROM trip_lifecycle_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.trip_id=$1 ORDER BY e.created_at DESC,e.id DESC',[tripId]),
  db.oneOrNone("SELECT c.user_id,u.name FROM trip_coordinators c JOIN users u ON u.id=c.user_id WHERE c.trip_id=$1 AND c.status='active' AND c.assignment_role='lead'",[tripId])
 ]);
 if(!trip)fail('Trip not found',404);
 return {trip,report,events,lead};
}
async function figures(t,tripId){
 const [attendance,expenses,contributions]=await Promise.all([
  t.any(`SELECT a.attendance_date::text AS day,a.status,COUNT(*)::int AS total FROM attendance a
   JOIN participants p ON p.trip_id=a.trip_id AND p.user_id=a.user_id AND p.status='approved'
   WHERE a.trip_id=$1 GROUP BY a.attendance_date,a.status ORDER BY a.attendance_date,a.status`,[tripId]),
  t.any('SELECT category,COUNT(*)::int AS entries,COALESCE(SUM(amount),0)::numeric AS total FROM expenses WHERE trip_id=$1 GROUP BY category ORDER BY category',[tripId]),
  t.any('SELECT COUNT(*)::int AS entries,COALESCE(SUM(amount),0)::numeric AS total FROM contributions WHERE trip_id=$1',[tripId])
 ]);
 const totalExpenses=expenses.reduce((n,r)=>n+Number(r.total),0);
 return {attendance,expenses,contributions,totalExpenses,totalContributions:Number(contributions[0].total)};
}
async function preview(tripId,userId){
 const state=await detail(tripId);
 const db=getDb();
 const assignment=await db.oneOrNone('SELECT assignment_role FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status=\'active\'',[tripId,userId]);
 const past=await db.oneOrNone('SELECT 1 FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2',[tripId,userId]);
 const f=await figures(db,tripId);
 const feedback=state.report?null:await feedbackSnapshot(tripId);
 return {...state,figures:f,feedback,canSubmit:!state.report&&assignment?.assignment_role==='lead'&&state.trip.operational_status==='awaiting_final_report'&&state.trip.approval_status==='approved',canRead:!!past};
}
async function submit(tripId,userId,input){
 if(!validId(tripId)||!validId(userId))fail('Invalid trip or user ID',400);
 const fields=validateReport(input);
 const feedback=await feedbackSnapshot(tripId);
 return getDb().tx(async t=>{
  const trip=await t.oneOrNone('SELECT * FROM trips WHERE id=$1 FOR UPDATE',[tripId]);
  if(!trip)fail('Trip not found',404);
  const lead=await t.oneOrNone(`SELECT 1 FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active' AND assignment_role='lead'`,[tripId,userId]);
  if(!lead)fail('Only the active lead Coordinator may submit the final report',403);
  if(trip.approval_status!=='approved'||trip.operational_status!=='awaiting_final_report'||!trip.is_active)fail('Trip must be awaiting its final report',409);
  const allowed=await t.one(`SELECT end_date < ${TZ_DAY} AS ended FROM trips WHERE id=$1`,[tripId]);
  if(!allowed.ended)fail('Final report can only be submitted after the trip has ended',409);
  const existing=await t.oneOrNone('SELECT id FROM trip_final_reports WHERE trip_id=$1',[tripId]);
  if(existing)fail('This trip already has a final report',409);
  const f=await figures(t,tripId);
  const approved=await t.one("SELECT COUNT(*)::int AS n FROM participants WHERE trip_id=$1 AND status='approved'",[tripId]);
  if(approved.n>0&&!f.attendance.length)fail('Record the final attendance before submitting this report',409);
  const report=await t.one(`INSERT INTO trip_final_reports(trip_id,submitted_by,final_attendance_summary,total_actual_expenses,expense_summary,total_student_contributions,contribution_summary,incident_report,feedback_count_at_submission,feedback_summary_at_submission,additional_notes)
  VALUES($1,$2,$3::jsonb,$4,$5::jsonb,$6,$7::jsonb,$8,$9,$10,$11) RETURNING id`,
  [tripId,userId,JSON.stringify(f.attendance),f.totalExpenses,JSON.stringify(f.expenses),f.totalContributions,JSON.stringify(f.contributions),fields.incident,feedback.count,feedback.summary,fields.notes||null]);
  await t.none(`UPDATE trips SET operational_status='completed',registration_open=FALSE,vacancies_held_closed=TRUE,completed_at=NOW(),updated_at=NOW() WHERE id=$1`,[tripId]);
  await t.none(`UPDATE trip_coordinators SET status='ended',ended_at=NOW(),ended_by=NULL,end_reason='Trip completed and final report archived' WHERE trip_id=$1 AND status='active'`,[tripId]);
  await t.none(`INSERT INTO trip_lifecycle_events(trip_id,actor_id,action,reason) VALUES($1,$2,'completed','Final report submitted and Coordinator assignments ended')`,[tripId,userId]);
  return report;
 });
}
async function queueNotification(t,eventId,tripId,subject,message){
 await t.none(`INSERT INTO trip_lifecycle_notifications(event_id,recipient_user_id,subject,message)
 SELECT $1,u.id,$3,$4 FROM users u WHERE u.is_active=TRUE AND u.email IS NOT NULL AND
 (u.role='dsa' OR EXISTS(SELECT 1 FROM participants p WHERE p.trip_id=$2 AND p.user_id=u.id AND p.status IN ('pending','approved')) OR
 EXISTS(SELECT 1 FROM trip_coordinators c WHERE c.trip_id=$2 AND c.user_id=u.id))
 ON CONFLICT DO NOTHING`,[eventId,tripId,subject,message]);
}
async function cancellation(tripId,dsaId,reason){
 if(!validId(tripId)||!validId(dsaId))fail('Invalid trip or DSA ID',400);
 reason=text(reason,1500);if(!reason)fail('DSA must provide a cancellation reason');
 return getDb().tx(async t=>{
  const dsa=await t.oneOrNone("SELECT 1 FROM users WHERE id=$1 AND role='dsa' AND is_active=TRUE AND is_verified=TRUE",[dsaId]);
  if(!dsa)fail('DSA authority required',403);
  const trip=await t.oneOrNone('SELECT * FROM trips WHERE id=$1 FOR UPDATE',[tripId]);if(!trip)fail('Trip not found',404);
  if(trip.approval_status!=='approved'||['completed','cancelled'].includes(trip.operational_status))fail('Only active approved trips can be cancelled',409);
  await t.none(`UPDATE trips SET operational_status='cancelled',registration_open=FALSE,vacancies_held_closed=TRUE,
   cancelled_at=NOW(),cancellation_reason=$2,updated_at=NOW() WHERE id=$1`,[tripId,reason]);
  await t.none(`UPDATE trip_coordinators SET status='ended',ended_at=NOW(),ended_by=$2,end_reason=$3 WHERE trip_id=$1 AND status='active'`,[tripId,dsaId,'Trip cancelled by DSA: '+reason]);
  const event=await t.one(`INSERT INTO trip_lifecycle_events(trip_id,actor_id,action,reason) VALUES($1,$2,'cancelled',$3) RETURNING id`,[tripId,dsaId,reason]);
  await queueNotification(t,event.id,tripId,`Trip cancelled: ${trip.title}`,`DSA has cancelled ${trip.title}. Reason: ${reason}`);
  return {eventId:event.id};
 });
}
async function sendPendingNotifications(limit=50){
 const db=getDb();const rows=await db.any(`SELECT n.id,u.email,n.subject,n.message FROM trip_lifecycle_notifications n JOIN users u ON u.id=n.recipient_user_id WHERE n.sent_at IS NULL AND u.is_active=TRUE ORDER BY n.id LIMIT $1`,[limit]);
 let sent=0;
 for(const row of rows){
  try{await sendEmail({to:row.email,subject:row.subject,text:row.message});await db.none('UPDATE trip_lifecycle_notifications SET sent_at=NOW(),last_error=NULL WHERE id=$1',[row.id]);sent++;}
  catch(err){await db.none('UPDATE trip_lifecycle_notifications SET last_error=$2 WHERE id=$1',[row.id,String(err.message).slice(0,500)]);}
 }
 return sent;
}
module.exports={validateReport,feedbackSnapshot,detail,preview,submit,cancellation,sendPendingNotifications,figures,fail};
