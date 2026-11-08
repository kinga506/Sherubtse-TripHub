const crypto=require('node:crypto');
const {getDb}=require('../config/db');
const {getStorage}=require('../config/storage');
const {composePackage,rosterSnapshot}=require('../services/finalNamelistPdf');
const {problem}=require('./Registration');
const rosterSql=`SELECT p.id AS participant_id,p.user_id,u.name,u.student_id,u.academic_year,pr.name AS programme, c.id AS consent_document_id,c.version_number AS consent_version,c.storage_key,c.detected_mime_type AS mime,c.verification_status FROM participants p JOIN users u ON u.id=p.user_id LEFT JOIN programmes pr ON pr.id=u.programme_id LEFT JOIN participant_consent_documents c ON c.participant_id=p.id AND c.is_current=TRUE WHERE p.trip_id=$1 AND p.status='approved' ORDER BY u.name,p.id`;
const serialize=rows=>JSON.stringify(rosterSnapshot(rows));
const sameSnapshot=(rows,previous)=>serialize(rows)===JSON.stringify((typeof previous==='string'?JSON.parse(previous):previous).map(p=>({participantId:Number(p.participantId),studentUserId:Number(p.studentUserId),name:String(p.name),studentId:String(p.studentId||''),programme:String(p.programme||''),academicYear:String(p.academicYear||''),consentDocumentId:Number(p.consentDocumentId),consentVersion:Number(p.consentVersion)}))); 
async function lockTrip(t,id){const trip=await t.oneOrNone('SELECT * FROM trips WHERE id=$1 FOR UPDATE',[id]);if(!trip)throw problem('Trip not found',404);return trip;}
async function readRoster(t,id){return t.any(rosterSql,[id]);}
async function invalidate(t,tripId,reason,actor=null){
 const changed=await t.any(`UPDATE final_participant_submissions SET review_status='superseded',invalidated_at=NOW(),invalidation_reason=$2 WHERE trip_id=$1 AND review_status IN ('approved','pending_dsa') AND invalidated_at IS NULL RETURNING id`,[tripId,reason]);
 for(const r of changed)await t.none(`INSERT INTO final_participant_review_history(submission_id,trip_id,actor_id,action,remarks) VALUES($1,$2,$3,'superseded',$4)`,[r.id,tripId,actor,reason]);return changed.length;
}
function validateRoster(trip,rows){
 if(trip.approval_status!=='approved'||!trip.is_active||['completed','cancelled'].includes(trip.operational_status))throw problem('Trip is not eligible for departure review',409);
 if(!rows.length)throw problem('At least one approved participant is required for this package',409);
 if(rows.length>trip.max_participants)throw problem('Approved participants exceed trip capacity',409);
 for(const row of rows)if(!row.consent_document_id||row.verification_status!=='verified'||!row.storage_key)throw problem('Every approved participant must have a current verified consent letter',409);
}
async function submit(tripId,actorId){
 let stored;
 try{return await getDb().tx(async t=>{
  const trip=await lockTrip(t,tripId);
  const lead=await t.oneOrNone(`SELECT 1 FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND assignment_role='lead' AND status='active'`,[tripId,actorId]);if(!lead)throw problem('Active lead Coordinator required',403);
  const rows=await readRoster(t,tripId);validateRoster(trip,rows);
  const outstanding=await t.oneOrNone(`SELECT id FROM final_participant_submissions WHERE trip_id=$1 AND review_status='pending_dsa' AND invalidated_at IS NULL`,[tripId]);if(outstanding)throw problem('Current submission is still awaiting DSA review',409);
  const storage=getStorage();const pdf=await composePackage(trip,rows.map(r=>({...r,studentId:r.student_id,consentVersion:r.consent_version,storageKey:r.storage_key})),key=>storage.get(key));
  stored=await storage.put(pdf,'application/pdf');
  const number=await t.one('SELECT COALESCE(MAX(submission_number),0)::int+1 AS n FROM final_participant_submissions WHERE trip_id=$1',[tripId]);
  const snapshot=rosterSnapshot(rows);const hash=crypto.createHash('sha256').update(pdf).digest('hex');
  const item=await t.one(`INSERT INTO final_participant_submissions(trip_id,submitted_by,submission_number,participant_snapshot,combined_pdf_storage_key,content_hash) VALUES($1,$2,$3,$4::jsonb,$5,$6) RETURNING id,submission_number`,[tripId,actorId,number.n,JSON.stringify(snapshot),stored.key,hash]);
  await t.none(`INSERT INTO final_participant_review_history(submission_id,trip_id,actor_id,action) VALUES($1,$2,$3,'submitted')`,[item.id,tripId,actorId]);return item;
 });}catch(err){if(stored)try{await getStorage().delete(stored.key);}catch(e){console.error('Failed orphan package cleanup',e.message);}throw err;}
}
async function current(tripId){const db=getDb();const [trip,rows,submissions]=await Promise.all([db.oneOrNone('SELECT * FROM trips WHERE id=$1',[tripId]),db.any(rosterSql,[tripId]),db.any('SELECT s.*,u.name AS submitter_name FROM final_participant_submissions s JOIN users u ON u.id=s.submitted_by WHERE s.trip_id=$1 ORDER BY submission_number DESC',[tripId])]);if(!trip)throw problem('Trip not found',404);const latest=submissions[0];const cleared=Boolean(latest&&latest.review_status==='approved'&&!latest.invalidated_at&&sameSnapshot(rows,latest.participant_snapshot));return {trip,rows,submissions,cleared};}
async function queue(){return getDb().any(`SELECT s.id,s.trip_id,s.submission_number,s.submitted_at,s.review_status,t.title,u.name AS submitted_by_name FROM final_participant_submissions s JOIN trips t ON t.id=s.trip_id JOIN users u ON u.id=s.submitted_by WHERE s.review_status='pending_dsa' AND s.invalidated_at IS NULL ORDER BY s.submitted_at ASC`);}
async function decide(submissionId,actorId,action,remarks){
 if(!['approve','changes_requested','reject'].includes(action))throw problem('Unsupported DSA decision');
 remarks=String(remarks||'').trim();if(action!=='approve'&&(!remarks||remarks.length>1500))throw problem('A review reason is required');
 return getDb().tx(async t=>{
  const existing=await t.oneOrNone('SELECT trip_id FROM final_participant_submissions WHERE id=$1',[submissionId]);if(!existing)throw problem('Submission not found',404);
  const trip=await lockTrip(t,existing.trip_id);
  const dsa=await t.oneOrNone(`SELECT 1 FROM users WHERE id=$1 AND role='dsa' AND is_active=TRUE AND is_verified=TRUE`,[actorId]);if(!dsa)throw problem('DSA authority required',403);
  const s=await t.one('SELECT * FROM final_participant_submissions WHERE id=$1 FOR UPDATE',[submissionId]);
  if(s.review_status!=='pending_dsa'||s.invalidated_at)throw problem('Submission is no longer pending review',409);
  const newest=await t.one('SELECT id FROM final_participant_submissions WHERE trip_id=$1 ORDER BY submission_number DESC LIMIT 1',[s.trip_id]);if(newest.id!==s.id)throw problem('A newer package exists',409);
  const rows=await readRoster(t,s.trip_id);
  if(action==='approve'){
   validateRoster(trip,rows);
   if(!sameSnapshot(rows,s.participant_snapshot))throw problem('Participant list or consent documents changed; a new submission is required',409);
  }
  const status=action==='approve'?'approved':action==='reject'?'rejected':'changes_requested';
  await t.none('UPDATE final_participant_submissions SET review_status=$2,reviewed_by=$3,reviewed_at=NOW(),review_remarks=$4 WHERE id=$1',[submissionId,status,actorId,remarks||null]);
  await t.none('INSERT INTO final_participant_review_history(submission_id,trip_id,actor_id,action,remarks) VALUES($1,$2,$3,$4,$5)',[submissionId,s.trip_id,actorId,status,remarks||null]);
  return {tripId:s.trip_id,status};
 });
}
async function document(submissionId,actorId){
 const db=getDb();const s=await db.oneOrNone('SELECT * FROM final_participant_submissions WHERE id=$1',[submissionId]);if(!s)throw problem('Package not found',404);
 const u=await db.oneOrNone('SELECT role FROM users WHERE id=$1 AND is_active=TRUE',[actorId]);
 const assigned=await db.oneOrNone(`SELECT 1 FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2`,[s.trip_id,actorId]);
 if(u?.role!=='dsa'&&!assigned)throw problem('Access denied',403);
 const bytes=await getStorage().get(s.combined_pdf_storage_key);
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==s.content_hash)throw problem('Stored PDF checksum mismatch',409);
 return {submission:s,bytes};
}
async function events(tripId){return getDb().any(`SELECT h.*,u.name AS actor_name FROM final_participant_review_history h LEFT JOIN users u ON u.id=h.actor_id WHERE h.trip_id=$1 ORDER BY h.created_at DESC,h.id DESC`,[tripId]);}
async function requireClearance(tripId){const state=await current(tripId);if(!state.cleared)throw problem('Not cleared for departure: latest confirmed namelist needs DSA approval',409);return state;}
module.exports={submit,current,queue,decide,document,events,invalidate,requireClearance,validateRoster,serialize};
