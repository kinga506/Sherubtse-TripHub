const {getDb}=require('../config/db');
const {problem,eligible}=require('./Registration');
const {sendEmail}=require('../services/mailer');

async function notify(to,subject,text){if(!to)return;try{await sendEmail({to,subject,text});}catch(e){console.error('TripHub notification delivery failed:',e.message);}}
async function tripLock(tx,tripId){const trip=await tx.oneOrNone('SELECT * FROM trips WHERE id=$1 FOR UPDATE',[tripId]);if(!trip)throw problem('Trip not found',404);return trip;}
async function coordinator(tx,tripId,actorId){const a=await tx.oneOrNone("SELECT assignment_role FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'",[tripId,actorId]);if(!a)throw problem('Active trip Coordinator assignment required',403);return a;}
async function participantLock(tx,tripId,id){const p=await tx.oneOrNone(`SELECT p.*,u.name AS student_name,u.email AS student_email FROM participants p JOIN users u ON u.id=p.user_id WHERE p.trip_id=$1 AND p.id=$2 FOR UPDATE OF p`,[tripId,id]);if(!p)throw problem('Join request not found',404);return p;}
async function currentConsent(tx,participantId){return tx.oneOrNone('SELECT * FROM participant_consent_documents WHERE participant_id=$1 AND is_current=TRUE FOR UPDATE',[participantId]);}
async function history(tx,tripId,pid,docId,actor,action,note){await tx.none('INSERT INTO participant_review_events(trip_id,participant_id,consent_document_id,actor_id,action,note) VALUES($1,$2,$3,$4,$5,$6)',[tripId,pid,docId,actor,action,note||null]);}
async function list(tripId){const db=getDb();return db.any(`SELECT p.id,p.user_id,p.status,p.requested_at,p.reason,p.decision_note,p.reviewed_at,u.name,u.email,c.id AS consent_id,c.version_number,c.verification_status,c.reviewer_note,c.original_filename FROM participants p JOIN users u ON u.id=p.user_id LEFT JOIN participant_consent_documents c ON c.participant_id=p.id AND c.is_current=TRUE WHERE p.trip_id=$1 ORDER BY p.requested_at,p.id`,[tripId]);}
async function reviewConsent(tripId,pid,actor,action,note){
 if(!['verify','correction'].includes(action))throw problem('Invalid consent-review action');
 note=String(note||'').trim();if(action==='correction'&&(!note||note.length>800))throw problem('Explain the required correction (up to 800 characters)');
 const result=await getDb().tx(async tx=>{
  const trip=await tripLock(tx,tripId);if(trip.approval_status!=='approved'||!trip.is_active||['completed','cancelled'].includes(trip.operational_status))throw problem('Trip is no longer manageable',409);
  await coordinator(tx,tripId,actor);const p=await participantLock(tx,tripId,pid);if(p.status!=='pending')throw problem('Only pending requests can have consent reviewed',409);
  const doc=await currentConsent(tx,p.id);if(!doc)throw problem('Consent letter not found',409);
  const status=action==='verify'?'verified':'correction_requested';
  await tx.none('UPDATE participant_consent_documents SET verification_status=$2,reviewed_by=$3,reviewed_at=NOW(),reviewer_note=$4 WHERE id=$1',[doc.id,status,actor,note||null]);
  await history(tx,tripId,p.id,doc.id,actor,action==='verify'?'verified':'correction_requested',note);
  return {email:p.student_email,trip:trip.title,status};
 });
 await notify(result.email,'Sherubtse TripHub: Consent review',`Your consent letter for ${result.trip} has been ${result.status==='verified'?'reviewed as complete. Participation is still pending approval.':'returned for correction. Please upload a corrected letter.'}${note?'\nNote: '+note:''}`);
 return result;
}
async function decision(tripId,pid,actor,action,note){
 if(!['approve','reject'].includes(action))throw problem('Invalid join-request decision');
 note=String(note||'').trim();if(action==='reject'&&(!note||note.length>800))throw problem('A rejection reason is required (up to 800 characters)');
 const result=await getDb().tx(async tx=>{
  const trip=await tripLock(tx,tripId);if(trip.approval_status!=='approved'||!trip.is_active||['completed','cancelled'].includes(trip.operational_status))throw problem('Trip is no longer manageable',409);
  await coordinator(tx,tripId,actor);const p=await participantLock(tx,tripId,pid);if(p.status!=='pending')throw problem('Request has already been reviewed',409);
  const doc=await currentConsent(tx,p.id);if(action==='approve'&&new Date(trip.start_date).toISOString().slice(0,10)<=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Thimphu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))throw problem('Trip has already started',409);
  if(action==='approve'&&(!doc||doc.verification_status!=='verified'))throw problem('The current consent letter must be verified before approval',409);
  const c=await tx.one("SELECT COUNT(*) FILTER (WHERE status IN ('pending','approved'))::int AS occupied FROM participants WHERE trip_id=$1",[tripId]);
  if(action==='approve'&&Number(c.occupied)>trip.max_participants)throw problem('Trip capacity exceeded',409);
  await tx.none('UPDATE participants SET status=$2,reviewed_by=$3,reviewed_at=NOW(),decision_note=$4 WHERE id=$1',[p.id,action==='approve'?'approved':'rejected',actor,note||null]);
  if(action==='reject')await tx.none('UPDATE trips SET vacancies_held_closed=TRUE,updated_at=NOW() WHERE id=$1',[tripId]);
  await history(tx,tripId,p.id,doc?.id||null,actor,action==='approve'?'approved':'rejected',note);
  await tx.none("INSERT INTO registration_events(trip_id,actor_id,participant_id,action,reason) VALUES($1,$2,$3,$4,$5)",[tripId,actor,p.id,action==='approve'?'participant_approved':'participant_rejected',note||null]);
  return {email:p.student_email,trip:trip.title,action};
 });
 await notify(result.email,`Sherubtse TripHub: Request ${result.action==='approve'?'approved':'rejected'}`,`Your request to join ${result.trip} was ${result.action==='approve'?'approved':'rejected'}.${note?'\nCoordinator note: '+note:''}`);
 return result;
}
async function replaceConsent(tripId,studentId,meta,key){
 return getDb().tx(async tx=>{
  const trip=await tripLock(tx,tripId);if(!trip||['completed','cancelled'].includes(trip.operational_status))throw problem('Trip cannot accept document changes',409);
  const p=await tx.oneOrNone('SELECT id,status FROM participants WHERE trip_id=$1 AND user_id=$2 FOR UPDATE',[tripId,studentId]);if(!p||p.status!=='pending')throw problem('Only pending applicants can replace consent in this step',409);
  const current=await currentConsent(tx,p.id);if(!current||current.verification_status!=='correction_requested')throw problem('Coordinator must request correction before replacement',409);
  const v=await tx.one('SELECT COALESCE(MAX(version_number),0)::int+1 AS n FROM participant_consent_documents WHERE participant_id=$1',[p.id]);
  await tx.none('UPDATE participant_consent_documents SET is_current=FALSE WHERE participant_id=$1 AND is_current=TRUE',[p.id]);
  const doc=await tx.one(`INSERT INTO participant_consent_documents(trip_id,participant_id,student_user_id,original_filename,storage_key,detected_mime_type,file_size,version_number,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$3) RETURNING id`,[tripId,p.id,studentId,meta.name,key,meta.mime,meta.size,v.n]);
  await history(tx,tripId,p.id,doc.id,studentId,'replaced','Corrected consent letter uploaded');
  await tx.none("INSERT INTO registration_events(trip_id,actor_id,participant_id,action) VALUES($1,$2,$3,'consent_replaced')",[tripId,studentId,p.id]);
  return doc.id;
 });
}
async function downloadConsent(tripId,pid,docId,actor){
 const db=getDb();const trip=await db.oneOrNone('SELECT id FROM trips WHERE id=$1',[tripId]);if(!trip)throw problem('Trip not found',404);
 const d=await db.oneOrNone(`SELECT d.*,p.user_id FROM participant_consent_documents d JOIN participants p ON p.id=d.participant_id WHERE d.trip_id=$1 AND d.participant_id=$2 AND d.id=$3`,[tripId,pid,docId]);if(!d)throw problem('Consent document not found',404);
 const role=await db.oneOrNone('SELECT role FROM users WHERE id=$1 AND is_active=TRUE',[actor]);
 const assigned=await db.oneOrNone("SELECT 1 FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'",[tripId,actor]);
 if(Number(d.user_id)!==Number(actor)&&!assigned&&role?.role!=='dsa')throw problem('Access denied',403);
 return d;
}
async function requestExtension(tripId,actor,deadline,reason){
 reason=String(reason||'').trim();const date=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(deadline||''))?new Date(`${deadline}:00+06:00`):new Date(NaN);
 if(!reason||reason.length>1000||!Number.isFinite(date.getTime()))throw problem('Provide a valid deadline and reason');
 return getDb().tx(async tx=>{
  const trip=await tripLock(tx,tripId);await coordinator(tx,tripId,actor);
  if(trip.approval_status!=='approved'||!trip.is_active||trip.operational_status!=='planned')throw problem('Trip is not eligible for an extension',409);
  if(new Date(trip.registration_deadline)>new Date())throw problem('Registration deadline has not passed',409);
  if(date<=new Date()||date<=new Date(trip.registration_deadline)||date>=new Date(trip.start_date))throw problem('Proposed deadline must be in the future and before departure',409);
  const count=await tx.one("SELECT COUNT(*) FILTER (WHERE status IN ('pending','approved'))::int AS occupied FROM participants WHERE trip_id=$1",[tripId]);
  const vacancy=trip.max_participants-Number(count.occupied);if(vacancy<1||!trip.vacancies_held_closed)throw problem('No held replacement vacancy',409);
  const pending=await tx.oneOrNone("SELECT id FROM registration_deadline_extensions WHERE trip_id=$1 AND status='pending'",[tripId]);if(pending)throw problem('There is already a pending extension request',409);
  const result=await tx.one(`INSERT INTO registration_deadline_extensions(trip_id,requested_by,original_deadline,proposed_deadline,vacancies_at_request,reason) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[tripId,actor,trip.registration_deadline,date,vacancy,reason]);
  await tx.none("INSERT INTO registration_events(trip_id,actor_id,action,reason) VALUES($1,$2,'deadline_extension_requested',$3)",[tripId,actor,reason]);return result;
 });
}
async function extensionQueue(){return getDb().any(`SELECT e.*,t.title,u.name AS requester_name FROM registration_deadline_extensions e JOIN trips t ON t.id=e.trip_id JOIN users u ON u.id=e.requested_by ORDER BY (e.status='pending') DESC,e.requested_at DESC`);}
async function extensionsForTrip(tripId){return getDb().any('SELECT * FROM registration_deadline_extensions WHERE trip_id=$1 ORDER BY requested_at DESC',[tripId]);}
async function decideExtension(id,actor,action,note){
 if(!['approve','reject'].includes(action))throw problem('Invalid DSA decision');note=String(note||'').trim();if(action==='reject'&&(!note||note.length>1000))throw problem('A rejection reason is required');
 return getDb().tx(async tx=>{
  const e=await tx.oneOrNone('SELECT * FROM registration_deadline_extensions WHERE id=$1',[id]);if(!e)throw problem('Extension request not found',404);
  const trip=await tripLock(tx,e.trip_id);
  const dsa=await tx.oneOrNone("SELECT id FROM users WHERE id=$1 AND role='dsa' AND is_active=TRUE AND is_verified=TRUE",[actor]);if(!dsa)throw problem('DSA approval required',403);
  const ext=await tx.one('SELECT * FROM registration_deadline_extensions WHERE id=$1 FOR UPDATE',[id]);if(ext.status!=='pending')throw problem('Request already decided',409);
  if(action==='approve'){
   if(trip.approval_status!=='approved'||trip.operational_status!=='planned'||new Date(trip.start_date)<=new Date()||new Date(ext.proposed_deadline)<=new Date())throw problem('This extension is no longer eligible',409);
   await tx.none('UPDATE trips SET registration_deadline=$2,registration_open=FALSE,vacancies_held_closed=TRUE,updated_at=NOW() WHERE id=$1',[trip.id,ext.proposed_deadline]);
  }
  await tx.none('UPDATE registration_deadline_extensions SET status=$2,reviewed_by=$3,reviewed_at=NOW(),review_note=$4 WHERE id=$1',[id,action==='approve'?'approved':'rejected',actor,note||null]);
  await tx.none('INSERT INTO registration_events(trip_id,actor_id,action,reason) VALUES($1,$2,$3,$4)',[trip.id,actor,action==='approve'?'deadline_extension_approved':'deadline_extension_rejected',note||null]);
  return {tripId:trip.id};
 });
}
module.exports={list,reviewConsent,decision,replaceConsent,downloadConsent,requestExtension,extensionQueue,extensionsForTrip,decideExtension};
