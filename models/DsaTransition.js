const {getDb}=require('../config/db');

const OPEN_STATUSES=['awaiting_activation','ready_to_complete'];
const REASONS=['New institutional appointment','Completion of tenure','Transfer to another position','Other'];
const fail=(message,status=422)=>Object.assign(new Error(message),{status});
const audit=(tx,actor,action,targetId,context)=>tx.none(
  `INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id,context) VALUES($1,$2,'dsa_transition',$3,$4)`,
  [actor,action,String(targetId),JSON.stringify(context)]
);
async function requireActiveSuperadmin(tx,actorId){
 const actor=await tx.oneOrNone(`SELECT id FROM users WHERE id=$1 AND role='admin' AND is_active=true AND is_verified=true FOR UPDATE`,[actorId]);
 if(!actor)throw fail('An active, verified Superadmin session is required.',403);
}

async function dashboard(query={}){
 const db=getDb(),search=String(query.q||'').trim().slice(0,100);
 const [active,pending,former,transitions,pendingReviews]=await Promise.all([
  db.any(`SELECT id,name,email,is_active,is_verified,created_at FROM users WHERE role='dsa' AND is_active=true AND is_verified=true AND ($1='' OR name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%') ORDER BY name,id`,[search]),
  db.any(`SELECT id,name,email,is_active,is_verified,created_at,CASE WHEN verification_token IS NULL THEN 'Invitation unavailable' WHEN verification_token_expires<=NOW() THEN 'Invitation expired' ELSE 'Awaiting activation' END AS invitation_status FROM users WHERE role='dsa' AND is_verified=false AND ($1='' OR name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%') ORDER BY created_at DESC,id DESC`,[search]),
  db.any(`SELECT id,name,email,is_active,is_verified,created_at FROM users WHERE role='dsa' AND is_verified=true AND is_active=false AND ($1='' OR name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%') ORDER BY name,id`,[search]),
  db.any(`SELECT t.id,t.outgoing_dsa_id,t.incoming_dsa_id,t.reason,t.effective_date,t.appointment_reference,t.transition_type,CASE WHEN t.status='awaiting_activation' AND i.is_active AND i.is_verified THEN 'ready_to_complete' ELSE t.status END AS status,t.created_at,t.completed_at,o.name AS outgoing_name,o.email AS outgoing_email,i.name AS incoming_name,i.email AS incoming_email,i.is_active AS incoming_active,i.is_verified AS incoming_verified,COALESCE(c.name,a.name) AS actor_name FROM dsa_transitions t JOIN users o ON o.id=t.outgoing_dsa_id LEFT JOIN users i ON i.id=t.incoming_dsa_id JOIN users a ON a.id=t.initiated_by LEFT JOIN users c ON c.id=t.completed_by WHERE ($1='' OR o.name ILIKE '%'||$1||'%' OR o.email ILIKE '%'||$1||'%' OR COALESCE(i.name,'') ILIKE '%'||$1||'%' OR COALESCE(i.email,'') ILIKE '%'||$1||'%') ORDER BY t.created_at DESC,t.id DESC LIMIT 200`,[search]),
  db.one(`SELECT (SELECT COUNT(*)::int FROM trips WHERE is_active AND approval_status='pending_dsa') AS proposals,(SELECT COUNT(*)::int FROM final_participant_submissions WHERE review_status='pending_dsa' AND invalidated_at IS NULL) AS final_namelists`)
 ]);
 return {active,pending,former,transitions,pendingReviews,search,reasons:REASONS};
}

async function initiate(input,actorId){
 const outgoingId=Number(input.outgoingDsaId),incomingId=Number(input.incomingDsaId),reason=String(input.reason||'').trim(),reference=String(input.appointmentReference||'').trim();
 const effectiveDate=String(input.effectiveDate||'');
 if(!Number.isSafeInteger(outgoingId)||outgoingId<1||!Number.isSafeInteger(incomingId)||incomingId<1)return Promise.reject(fail('Select an outgoing and incoming DSA account.'));
 if(outgoingId===incomingId)return Promise.reject(fail('Outgoing and incoming DSA accounts must be different.'));
 if(!REASONS.includes(reason))return Promise.reject(fail('Select a transition reason.'));
 const parsedDate=new Date(`${effectiveDate}T00:00:00Z`);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)||!Number.isFinite(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==effectiveDate)return Promise.reject(fail('Enter a valid effective date.'));
 if(reference.length>200)return Promise.reject(fail('Appointment reference must be 200 characters or fewer.'));
 return getDb().tx(async tx=>{
  await tx.one('SELECT pg_advisory_xact_lock($1,$2)',[71342,3]);
  await requireActiveSuperadmin(tx,actorId);
  const future=await tx.one(`SELECT $1::date > (NOW() AT TIME ZONE 'Asia/Thimphu')::date AS future`,[effectiveDate]);
  if(future.future)throw fail('Future transition dates are not supported. The transition takes effect when you confirm it.');
  const rows=await tx.any(`SELECT id,role,is_active,is_verified FROM users WHERE id IN ($1,$2) ORDER BY id FOR UPDATE`,[outgoingId,incomingId]);
  const outgoing=rows.find(row=>Number(row.id)===outgoingId),incoming=rows.find(row=>Number(row.id)===incomingId);
  if(!outgoing||outgoing.role!=='dsa'||!outgoing.is_active||!outgoing.is_verified)throw fail('The outgoing account must be an active, verified DSA.');
  if(!incoming||incoming.role!=='dsa')throw fail('The incoming account must already have the DSA role. Student accounts cannot be promoted here.');
  if(incoming.is_verified&&!incoming.is_active)throw fail('The incoming DSA account must be active.');
  const conflict=await tx.oneOrNone(`SELECT id FROM dsa_transitions WHERE status IN ('awaiting_activation','ready_to_complete') AND (outgoing_dsa_id IN ($1,$2) OR incoming_dsa_id IN ($1,$2)) LIMIT 1`,[outgoingId,incomingId]);
  if(conflict)throw fail('One of these DSA accounts is already part of an unfinished transition.',409);
  const status=incoming.is_active&&incoming.is_verified?'ready_to_complete':'awaiting_activation';
  const transition=await tx.one(`INSERT INTO dsa_transitions(outgoing_dsa_id,incoming_dsa_id,initiated_by,reason,effective_date,appointment_reference,transition_type,status) VALUES($1,$2,$3,$4,$5,$6,'normal',$7) RETURNING id,status`,[outgoingId,incomingId,actorId,reason,effectiveDate,reference||null,status]);
  await audit(tx,actorId,'dsa_transition_initiated',transition.id,{outgoingDsaId:outgoingId,incomingDsaId:incomingId,status,reason});
  return transition;
 });
}

async function transitionById(id){
 if(!/^\d{1,15}$/.test(String(id)))return null;
 return getDb().oneOrNone(`SELECT t.id,t.outgoing_dsa_id,t.incoming_dsa_id,t.initiated_by,t.reason,t.effective_date,t.appointment_reference,CASE WHEN t.status='awaiting_activation' AND i.is_active AND i.is_verified THEN 'ready_to_complete' ELSE t.status END AS status,t.transition_type,t.created_at,t.completed_at,o.name AS outgoing_name,o.email AS outgoing_email,o.is_active AS outgoing_active,i.name AS incoming_name,i.email AS incoming_email,i.is_active AS incoming_active,i.is_verified AS incoming_verified,COALESCE(c.name,a.name) AS actor_name FROM dsa_transitions t JOIN users o ON o.id=t.outgoing_dsa_id LEFT JOIN users i ON i.id=t.incoming_dsa_id JOIN users a ON a.id=t.initiated_by LEFT JOIN users c ON c.id=t.completed_by WHERE t.id=$1`,[id]);
}

async function auditRejected(actorId,action,targetId,status){
 return getDb().none(`INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id,context) VALUES($1,$2,'dsa_transition',$3,$4)`,[actorId,action,targetId==null?null:String(targetId),JSON.stringify({status})]);
}

async function complete(id,actorId){
 if(!/^\d{1,15}$/.test(String(id)))throw fail('Transition not found.',404);
 return getDb().tx(async tx=>{
  await tx.one('SELECT pg_advisory_xact_lock($1,$2)',[71342,3]);
  await requireActiveSuperadmin(tx,actorId);
  const transition=await tx.oneOrNone(`SELECT id,outgoing_dsa_id,incoming_dsa_id,initiated_by,status,transition_type FROM dsa_transitions WHERE id=$1 FOR UPDATE`,[id]);
  if(!transition||transition.transition_type!=='normal'||!OPEN_STATUSES.includes(transition.status))throw fail('This transition is no longer awaiting completion.',409);
  const ids=[Number(transition.outgoing_dsa_id),Number(transition.incoming_dsa_id)].sort((a,b)=>a-b);
  const users=await tx.any(`SELECT id,role,is_active,is_verified FROM users WHERE id IN ($1,$2) ORDER BY id FOR UPDATE`,ids);
  const outgoing=users.find(user=>Number(user.id)===Number(transition.outgoing_dsa_id)),incoming=users.find(user=>Number(user.id)===Number(transition.incoming_dsa_id));
  if(!outgoing||outgoing.role!=='dsa'||!outgoing.is_active||!outgoing.is_verified)throw fail('The outgoing DSA is no longer eligible.',409);
  if(!incoming||incoming.role!=='dsa'||!incoming.is_active||!incoming.is_verified)throw fail('Awaiting incoming DSA account activation.',409);
  const conflict=await tx.oneOrNone(`SELECT id FROM dsa_transitions WHERE id<>$1 AND status IN ('awaiting_activation','ready_to_complete') AND (outgoing_dsa_id IN ($2,$3) OR incoming_dsa_id IN ($2,$3)) LIMIT 1`,[id,transition.outgoing_dsa_id,transition.incoming_dsa_id]);
  if(conflict)throw fail('A conflicting transition is already in progress.',409);
  await tx.none(`UPDATE users SET is_active=false WHERE id=$1`,[transition.outgoing_dsa_id]);
  await tx.none(`DELETE FROM session WHERE sess->>'userId'=$1`,[String(transition.outgoing_dsa_id)]);
  const completed=await tx.one(`UPDATE dsa_transitions SET status='completed',completed_by=$2,completed_at=NOW() WHERE id=$1 RETURNING id,status,completed_at`,[id,actorId]);
  await audit(tx,actorId,'dsa_transition_completed',id,{outgoingDsaId:Number(transition.outgoing_dsa_id),incomingDsaId:Number(transition.incoming_dsa_id)});
  return completed;
 });
}

async function emergencyRevoke(userId,reason,actorId){
 const id=Number(userId),text=String(reason||'').trim();
 if(!Number.isSafeInteger(id)||id<1)throw fail('Select a valid DSA account.');
 if(text.length<8||text.length>500)throw fail('Provide an emergency reason between 8 and 500 characters.');
 return getDb().tx(async tx=>{
  await tx.one('SELECT pg_advisory_xact_lock($1,$2)',[71342,3]);
  await requireActiveSuperadmin(tx,actorId);
  const user=await tx.oneOrNone(`SELECT id,role,is_active,is_verified FROM users WHERE id=$1 FOR UPDATE`,[id]);
  if(!user||user.role!=='dsa')throw fail('The selected account is not a DSA.',404);
  if(!user.is_active)throw fail('This DSA account is already inactive.',409);
  const open=await tx.any(`SELECT id FROM dsa_transitions WHERE status IN ('awaiting_activation','ready_to_complete') AND (outgoing_dsa_id=$1 OR incoming_dsa_id=$1) FOR UPDATE`,[id]);
  for(const pending of open){await tx.none(`UPDATE dsa_transitions SET status='cancelled' WHERE id=$1`,[pending.id]);await audit(tx,actorId,'dsa_transition_cancelled_by_emergency',pending.id,{dsaId:id});}
  const row=await tx.one(`INSERT INTO dsa_transitions(outgoing_dsa_id,incoming_dsa_id,initiated_by,completed_by,reason,effective_date,transition_type,status,completed_at) VALUES($1,NULL,$2,$2,$3,(NOW() AT TIME ZONE 'Asia/Thimphu')::date,'emergency','emergency_revoked',NOW()) RETURNING id,completed_at`,[id,actorId,text]);
  await tx.none(`UPDATE users SET is_active=false WHERE id=$1`,[id]);
  await tx.none(`DELETE FROM session WHERE sess->>'userId'=$1`,[String(id)]);
  await audit(tx,actorId,'dsa_emergency_access_revoked',row.id,{outgoingDsaId:id,reason:text});
  const remaining=await tx.one(`SELECT COUNT(*)::int AS count FROM users WHERE role='dsa' AND is_active=true AND is_verified=true`);
  return {...row,remainingActiveDsa:remaining.count};
 });
}

module.exports={dashboard,initiate,transitionById,complete,emergencyRevoke,auditRejected,REASONS};
