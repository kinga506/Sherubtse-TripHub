// Step 16: per-day attendance and coordinator-only CSV export queries.
const {getDb}=require('../config/db');
const {validId}=require('./Access');
const STATUSES=['present','absent','late','excused'];
function fail(message,status=422){const error=new Error(message);error.status=status;throw error;}
function dateOnly(value){
 const valueText=String(value??'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(valueText))fail('Enter a valid attendance date');
 const parsed=new Date(valueText+'T00:00:00Z');
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==valueText)fail('Enter a valid attendance date');
 return valueText;
}
function day(value){return typeof value==='string'?value.slice(0,10):new Date(value).toISOString().slice(0,10);}
function validDay(value,trip,today=new Date().toISOString().slice(0,10)){
 const d=dateOnly(value);
 if(d<day(trip.start_date)||d>day(trip.end_date))fail('Attendance date must fall within the trip dates');
 if(d>today)fail('Cannot record attendance for a future date');
 return d;
}
function writable(trip){return Boolean(trip.is_active&&trip.approval_status==='approved'&&!['completed','cancelled'].includes(trip.operational_status));}
async function access(db,tripId,userId){
 if(!validId(tripId))fail('Invalid trip ID',400);
 const trip=await db.oneOrNone('SELECT id,title,start_date,end_date,approval_status,operational_status,is_active FROM trips WHERE id=$1',[tripId]);
 if(!trip)fail('Trip not found',404);
 const assignment=await db.oneOrNone("SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'",[tripId,userId]);
 const approved=await db.oneOrNone("SELECT id FROM participants WHERE trip_id=$1 AND user_id=$2 AND status='approved'",[tripId,userId]);
 const historical=(!assignment&&['completed','cancelled'].includes(trip.operational_status))
  ?await db.oneOrNone('SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 LIMIT 1',[tripId,userId]):null;
 if(!assignment&&!approved&&!historical)fail('Access denied',403);
 return {trip,isCoordinator:Boolean(assignment||historical),isParticipant:Boolean(approved),canManage:Boolean(assignment&&writable(trip))};
}
async function overview(tripId,userId,selected){
 const db=getDb(),ctx=await access(db,tripId,userId);
 // Participant-only requests never load the roster or any other student's attendance.
 if(!ctx.isCoordinator){
  const records=await db.any('SELECT attendance_date,status FROM attendance WHERE trip_id=$1 AND user_id=$2 ORDER BY attendance_date DESC',[tripId,userId]);
  return {...ctx,records,STATUSES};
 }
 const today=new Date().toISOString().slice(0,10);
 const suggested=selected|| (today<day(ctx.trip.start_date)?day(ctx.trip.start_date):(today>day(ctx.trip.end_date)?day(ctx.trip.end_date):today));
 const selectedDate=dateOnly(suggested);
 if(selectedDate<day(ctx.trip.start_date)||selectedDate>day(ctx.trip.end_date))fail('Date must fall within trip dates');
 const [roster,records]=await Promise.all([
  db.any("SELECT p.user_id,u.name,u.student_id FROM participants p JOIN users u ON u.id=p.user_id WHERE p.trip_id=$1 AND p.status='approved' ORDER BY u.name,u.id",[tripId]),
  db.any('SELECT user_id,status FROM attendance WHERE trip_id=$1 AND attendance_date=$2',[tripId,selectedDate])
 ]);
 const lookup=new Map(records.map(r=>[Number(r.user_id),r.status]));
 return {...ctx,selectedDate,roster:roster.map(p=>({...p,status:lookup.get(Number(p.user_id))||''})),STATUSES};
}
async function saveOne(tripId,actorId,body){
 const studentId=body.user_id,status=String(body.status||''),when=dateOnly(body.attendance_date);
 if(!validId(tripId)||!validId(studentId))fail('Invalid trip or student ID',400);
 if(!STATUSES.includes(status))fail('Choose a valid attendance status');
 return getDb().tx(async t=>{
  const trip=await t.oneOrNone('SELECT id,start_date,end_date,is_active,approval_status,operational_status FROM trips WHERE id=$1 FOR UPDATE',[tripId]);
  if(!trip)fail('Trip not found',404);
  if(!writable(trip))fail('Trip attendance is read-only',409);
  validDay(when,trip);
  const assigned=await t.oneOrNone("SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'",[tripId,actorId]);
  if(!assigned)fail('Active Coordinator assignment required',403);
  const student=await t.oneOrNone("SELECT id FROM participants WHERE trip_id=$1 AND user_id=$2 AND status='approved'",[tripId,studentId]);
  if(!student)fail('Attendance is available for approved participants only',422);
  return t.one(`INSERT INTO attendance(trip_id,user_id,attendance_date,status,recorded_by) VALUES($1,$2,$3,$4,$5)
   ON CONFLICT(trip_id,user_id,attendance_date) DO UPDATE SET status=EXCLUDED.status,recorded_by=EXCLUDED.recorded_by RETURNING id`,[tripId,studentId,when,status,actorId]);
 });
}
async function markAllPresent(tripId,actorId,body){
 if(!validId(tripId))fail('Invalid trip ID',400);
 const when=dateOnly(body.attendance_date);
 return getDb().tx(async t=>{
  const trip=await t.oneOrNone('SELECT id,start_date,end_date,is_active,approval_status,operational_status FROM trips WHERE id=$1 FOR UPDATE',[tripId]);
  if(!trip)fail('Trip not found',404);
  if(!writable(trip))fail('Trip attendance is read-only',409);
  validDay(when,trip);
  const assigned=await t.oneOrNone("SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'",[tripId,actorId]);
  if(!assigned)fail('Active Coordinator assignment required',403);
  // Only approved participants are affected; one SQL statement updates all rows atomically.
  return t.result(`INSERT INTO attendance(trip_id,user_id,attendance_date,status,recorded_by)
   SELECT $1,p.user_id,$2,'present',$3 FROM participants p WHERE p.trip_id=$1 AND p.status='approved'
   ON CONFLICT(trip_id,user_id,attendance_date) DO UPDATE SET status='present',recorded_by=EXCLUDED.recorded_by`,[tripId,when,actorId]);
 });
}
async function exportRows(tripId,actorId,kind){
 if(!validId(tripId))fail('Invalid trip ID',400);
 if(!['attendance','expenses'].includes(kind))fail('Unknown export type',404);
 const db=getDb();
 const permitted=await db.oneOrNone(`SELECT t.id FROM trips t JOIN trip_coordinators c ON c.trip_id=t.id
  WHERE t.id=$1 AND c.user_id=$2 AND c.status='active' AND t.is_active=TRUE
  AND t.approval_status='approved' AND t.operational_status NOT IN ('completed','cancelled')`,[tripId,actorId]);
 if(!permitted)fail('Active Coordinator assignment required to export',403);
 if(kind==='attendance')return db.any(`SELECT a.attendance_date,u.student_id,u.name,a.status FROM attendance a
 JOIN users u ON u.id=a.user_id JOIN participants p ON p.trip_id=a.trip_id AND p.user_id=a.user_id
 WHERE a.trip_id=$1 AND p.status='approved' ORDER BY a.attendance_date,u.name,u.id`,[tripId]);
 return db.any(`SELECT spent_on,category,description,amount FROM expenses WHERE trip_id=$1 ORDER BY spent_on,id`,[tripId]);
}
// Quote fields and disarm spreadsheet-formula injection (Excel/Sheets) without modifying stored values.
function csvValue(value){
 let s=value==null?'':String(value);
 if(/^[\s\u0000-\u001f]*[=+@\-]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function csv(kind,rows){
 const columns=kind==='attendance'?['attendance_date','student_id','name','status']:['spent_on','category','description','amount'];
 return '\uFEFF'+[columns.join(','),...rows.map(row=>columns.map(c=>csvValue(c.endsWith('_date')||c==='spent_on'?day(row[c]):row[c])).join(','))].join('\r\n')+'\r\n';
}
module.exports={overview,saveOne,markAllPresent,exportRows,csv,csvValue,dateOnly,validDay,writable,STATUSES};
