const {getDb}=require('../config/db');
const Proposal=require('./Proposal');
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const activeStudentQuery=`SELECT id,name,email FROM users WHERE id=$1 AND role='student' AND is_active=true AND is_verified=true`;
async function attachments(tripId){return getDb().any(`SELECT a.id,a.original_filename,a.document_title,a.description,a.detected_mime_type,a.file_size,a.uploaded_at,a.is_active,a.submission_id FROM trip_attachments a WHERE a.trip_id=$1 ORDER BY a.id DESC`,[tripId]);}
async function addAttachment(tripId,userId,meta,storageKey){return getDb().tx(async t=>{
 const trip=await t.oneOrNone(`SELECT id FROM trips WHERE id=$1 AND proposed_by_user_id=$2 AND approval_status IN ('draft','changes_requested') AND is_active=true FOR UPDATE`,[tripId,userId]);
 if(!trip)fail('Proposal is locked for DSA review',403);
 const count=await t.one(`SELECT count(*)::int AS count FROM trip_attachments WHERE trip_id=$1 AND is_active=true`,[tripId]);
 if(count.count>=12)fail('Maximum 12 current attachments per proposal',422);
 return t.one(`INSERT INTO trip_attachments(trip_id,uploaded_by,original_filename,document_title,description,storage_key,detected_mime_type,file_size)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[tripId,userId,meta.name,meta.title,meta.description||null,storageKey,meta.mime,meta.size]);
});}
async function supersedeAttachment(tripId,id,userId){return getDb().tx(async t=>{
 const trip=await t.oneOrNone(`SELECT id FROM trips WHERE id=$1 AND proposed_by_user_id=$2 AND approval_status IN ('draft','changes_requested') FOR UPDATE`,[tripId,userId]);
 if(!trip)fail('Proposal is locked',403);
 const r=await t.result(`UPDATE trip_attachments SET is_active=false,superseded_at=NOW() WHERE trip_id=$1 AND id=$2 AND is_active=true`,[tripId,id]);
 if(!r.rowCount)fail('Attachment not found',404);
});}
async function getAttachment(tripId,id){return getDb().oneOrNone(`SELECT a.*, t.proposed_by_user_id,t.approval_status FROM trip_attachments a JOIN trips t ON t.id=a.trip_id WHERE a.trip_id=$1 AND a.id=$2`,[tripId,id]);}
async function latestSubmission(tripId){return getDb().oneOrNone(`SELECT * FROM trip_submissions WHERE trip_id=$1 ORDER BY submission_number DESC LIMIT 1`,[tripId]);}
async function history(tripId){return getDb().any(`SELECT h.*,u.name AS reviewer_name FROM trip_approval_history h LEFT JOIN users u ON u.id=h.reviewed_by WHERE h.trip_id=$1 ORDER BY h.id DESC`,[tripId]);}
async function submit(tripId,userId){return getDb().tx(async t=>{
 const trip=await t.oneOrNone(`SELECT * FROM trips WHERE id=$1 AND proposed_by_user_id=$2 AND approval_status IN ('draft','changes_requested') AND is_active=true FOR UPDATE`,[tripId,userId]);
 if(!trip)fail('Only your editable proposal may be submitted',403);
 const [itinerary,costs,files]=await Promise.all([
  t.any(`SELECT day_number,to_char(start_time,'HH24:MI') AS start_time,title,description FROM itineraries WHERE trip_id=$1 ORDER BY day_number,sort_order,id`,[tripId]),
  t.any('SELECT label,amount FROM trip_cost_items WHERE trip_id=$1 ORDER BY sort_order,id',[tripId]),
  t.any('SELECT id FROM trip_attachments WHERE trip_id=$1 AND is_active=true ORDER BY id',[tripId])
 ]);
 const validated=Proposal.validate({...trip,start_date:trip.start_date.toISOString().slice(0,10),end_date:trip.end_date.toISOString().slice(0,10),meeting_time:String(trip.meeting_time||'').slice(0,5),registration_deadline:trip.registration_deadline.toISOString(),itinerary,costs},{strict:true});
 if(validated.errors.length)fail(validated.errors.join('; '),422);
 const n=await t.one('SELECT COALESCE(MAX(submission_number),0)+1 AS num FROM trip_submissions WHERE trip_id=$1',[tripId]);
 const snapshot={trip, itinerary,costs,attachment_ids:files.map(f=>f.id)};
 const sub=await t.one(`INSERT INTO trip_submissions(trip_id,submitted_by,submission_number,proposal_snapshot) VALUES($1,$2,$3,$4) RETURNING id,submission_number`,[tripId,userId,n.num,JSON.stringify(snapshot)]);
 for(const f of files){await t.none('INSERT INTO trip_submission_attachments(submission_id,attachment_id) VALUES($1,$2)',[sub.id,f.id]);
 await t.none('UPDATE trip_attachments SET submission_id=COALESCE(submission_id,$1) WHERE id=$2',[sub.id,f.id]);}
 await t.none(`UPDATE trips SET approval_status='pending_dsa',registration_open=false,updated_at=NOW() WHERE id=$1`,[tripId]);
 await t.none(`INSERT INTO trip_approval_history(trip_id,submission_id,submitted_by,action) VALUES($1,$2,$3,$4)`,[tripId,sub.id,userId,n.num>1?'resubmitted':'submitted']);
 return sub;
});}
async function queue(){return getDb().any(`SELECT t.id,t.title,t.approval_status,t.created_at,u.name AS proposer_name,s.id AS submission_id,s.submission_number FROM trips t JOIN users u ON u.id=t.proposed_by_user_id JOIN LATERAL (SELECT id,submission_number FROM trip_submissions WHERE trip_id=t.id ORDER BY submission_number DESC LIMIT 1) s ON true WHERE t.approval_status='pending_dsa' ORDER BY t.updated_at,t.id`);}
async function reviewData(tripId,version=null){
 const trip=await getDb().oneOrNone(`SELECT t.*,u.name AS proposer_name FROM trips t JOIN users u ON u.id=t.proposed_by_user_id WHERE t.id=$1`,[tripId]);
 if(!trip)return null;
 const sub=version===null?await latestSubmission(tripId):await getDb().oneOrNone('SELECT * FROM trip_submissions WHERE trip_id=$1 AND submission_number=$2',[tripId,version]);
 if(!sub)return {trip,sub:null,files:[],events:await history(tripId),assignments:[],versions:[]};
 const [files,events,assignments,versions]=await Promise.all([getDb().any(`SELECT a.id,a.document_title,a.original_filename,a.description,a.detected_mime_type,a.file_size FROM trip_attachments a JOIN trip_submission_attachments sa ON sa.attachment_id=a.id WHERE sa.submission_id=$1 ORDER BY a.id`,[sub.id]),history(tripId),getDb().any(`SELECT c.*,u.name FROM trip_coordinators c JOIN users u ON u.id=c.user_id WHERE c.trip_id=$1 ORDER BY c.assigned_at DESC,c.id DESC`,[tripId]),getDb().any('SELECT id,submission_number,submitted_at FROM trip_submissions WHERE trip_id=$1 ORDER BY submission_number DESC',[tripId])]);
 return {trip,sub,files,events,assignments,versions};
}
async function eligibleStudents(){return getDb().any(`SELECT id,name,email FROM users WHERE role='student' AND is_active=true AND is_verified=true ORDER BY name,id LIMIT 500`);}
function normalizedIds(lead,assistants){
 const leadId=Number(lead);if(!Number.isSafeInteger(leadId)||leadId<=0)fail('Choose an eligible lead Student',422);
 const extras=[...new Set((Array.isArray(assistants)?assistants:assistants?[assistants]:[]).map(Number))];
 if (extras.includes(leadId)) {
  fail(
    'The Lead Coordinator cannot also be an Assistant Coordinator. Please deselect the Lead Student from the assistant list.',
    422
  );
}

if (
  extras.some(id => !Number.isSafeInteger(id) || id < 1) ||
  extras.length > 15
) {
  fail('Please select valid Assistant Coordinators (maximum 15).', 422);
}
 return {leadId,extras};
}
async function decide(tripId,dsaId,action,remarks,lead,assistants){
 if(!['approved','changes_requested','rejected'].includes(action))fail('Invalid decision',422);
 if(action!=='approved'&&!String(remarks||'').trim())fail('Reason is required',422);
 const ids=action==='approved'?normalizedIds(lead,assistants):null;
 return getDb().tx(async t=>{
 const trip=await t.oneOrNone(`SELECT * FROM trips WHERE id=$1 AND approval_status='pending_dsa' FOR UPDATE`,[tripId]);if(!trip)fail('Proposal is not awaiting DSA review');
 const sub=await t.oneOrNone(`SELECT id FROM trip_submissions WHERE trip_id=$1 ORDER BY submission_number DESC LIMIT 1`,[tripId]);if(!sub)fail('Submitted proposal version missing');
 if(ids){for(const userId of [ids.leadId,...ids.extras]){if(!await t.oneOrNone(activeStudentQuery,[userId]))fail('Assigned Student must be active and verified',422);}
  // Retain current assignments during an approved re-review. Ensure one valid lead without duplicating rows.
  const current=await t.any(`SELECT id,user_id,assignment_role FROM trip_coordinators WHERE trip_id=$1 AND status='active' FOR UPDATE`,[tripId]);
  const target=new Map([[ids.leadId,'lead'],...ids.extras.map(id=>[id,'assistant'])]);
  for(const old of current){if(target.get(Number(old.user_id))!==old.assignment_role){await t.none(`UPDATE trip_coordinators SET status='ended',ended_at=NOW(),ended_by=$2,end_reason='DSA reapproval or reassignment' WHERE id=$1`,[old.id,dsaId]);}}
  for(const [id,role] of target){if(!current.some(x=>Number(x.user_id)===id&&x.assignment_role===role))await t.none(`INSERT INTO trip_coordinators(trip_id,user_id,assignment_role,assigned_by) VALUES($1,$2,$3,$4)`,[tripId,id,role,dsaId]);}
 }
 if(action==='rejected')await t.none(`UPDATE trip_coordinators SET status='ended',ended_at=NOW(),ended_by=$2,end_reason='DSA rejected proposal' WHERE trip_id=$1 AND status='active'`,[tripId,dsaId]);
 await t.none(`UPDATE trips SET approval_status=$2,registration_open=false,dsa_reviewed_by=$3,dsa_reviewed_at=NOW(),dsa_remarks=$4,updated_at=NOW() WHERE id=$1`,[tripId,action,dsaId,String(remarks||'').trim()||null]);
 await t.none(`INSERT INTO trip_approval_history(trip_id,submission_id,reviewed_by,action,remarks) VALUES($1,$2,$3,$4,$5)`,[tripId,sub.id,dsaId,action,String(remarks||'').trim()||null]);
 });
}
async function reassign(tripId,dsaId,lead,assistants,reason){
 if(!String(reason||'').trim())fail('Assignment change reason required',422);
 const ids=normalizedIds(lead,assistants);
 return getDb().tx(async t=>{
 const trip=await t.oneOrNone(`SELECT id FROM trips WHERE id=$1 AND approval_status='approved' AND operational_status NOT IN ('completed','cancelled') FOR UPDATE`,[tripId]);if(!trip)fail('Trip is not active and approved');
 for(const id of [ids.leadId,...ids.extras])if(!await t.oneOrNone(activeStudentQuery,[id]))fail('Student must be active and verified',422);
 const current=await t.any(`SELECT id,user_id,assignment_role FROM trip_coordinators WHERE trip_id=$1 AND status='active' FOR UPDATE`,[tripId]);
 const target=new Map([[ids.leadId,'lead'],...ids.extras.map(id=>[id,'assistant'])]);
 for(const old of current)if(target.get(Number(old.user_id))!==old.assignment_role)await t.none(`UPDATE trip_coordinators SET status='ended',ended_at=NOW(),ended_by=$2,end_reason=$3 WHERE id=$1`,[old.id,dsaId,reason]);
 for(const [id,role] of target)if(!current.some(x=>Number(x.user_id)===id&&x.assignment_role===role))await t.none('INSERT INTO trip_coordinators(trip_id,user_id,assignment_role,assigned_by) VALUES($1,$2,$3,$4)',[tripId,id,role,dsaId]);
 await t.none(`INSERT INTO trip_approval_history(trip_id,reviewed_by,action,remarks) VALUES($1,$2,'assignment_changed',$3)`,[tripId,dsaId,reason]);
 });
}
async function requestHandover(tripId,userId,reason){
 if(!String(reason||'').trim())fail('Provide a handover reason',422);
 return getDb().tx(async t=>{
 const trip=await t.oneOrNone(`SELECT id FROM trips WHERE id=$1 AND approval_status='approved' FOR UPDATE`,[tripId]);if(!trip)fail('Trip not approved');
 if(!await t.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'`,[tripId,userId]))fail('Active assignment required',403);
 await t.none(`INSERT INTO trip_approval_history(trip_id,submitted_by,action,remarks) VALUES($1,$2,'handover_requested',$3)`,[tripId,userId,String(reason).trim()]);
 });
}
module.exports={attachments,addAttachment,supersedeAttachment,getAttachment,latestSubmission,history,submit,queue,reviewData,eligibleStudents,decide,reassign,requestHandover,normalizedIds};
