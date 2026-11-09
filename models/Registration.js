const {getDb}=require('../config/db');

function problem(message,status=422){return Object.assign(new Error(message),{status});}
function eligible(trip,now=new Date(),{requireVisible=false}={}){
 if(!trip||trip.approval_status!=='approved'||!trip.is_active||!['planned','ongoing'].includes(trip.operational_status))throw problem('Trip is not eligible for registration',409);
 const todayBhutan=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Thimphu',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const tripStart=new Date(trip.start_date).toISOString().slice(0,10);
 const tripEnd=new Date(trip.end_date).toISOString().slice(0,10);
 if(trip.is_sample)throw problem('Sample trips cannot accept registration',409);
 if(tripEnd<todayBhutan)throw problem('Trip has ended',409);
 if(requireVisible&&trip.is_publicly_hidden)throw problem('Trip is hidden from public participation',404);
 if(tripStart<=todayBhutan)throw problem('Trip has already started',409);
 if(new Date(trip.registration_deadline).getTime()<now.getTime())throw problem('Registration deadline has passed',409);
}
async function lockedTrip(t,id){return t.oneOrNone('SELECT * FROM trips WHERE id=$1 FOR UPDATE',[id]);}
async function counts(t,id){return t.one(`SELECT COUNT(*) FILTER (WHERE status IN ('pending','approved'))::int AS occupied, COUNT(*) FILTER (WHERE status='approved')::int AS confirmed FROM participants WHERE trip_id=$1`,[id]);}
async function costReady(t,trip){
 const c=await t.one('SELECT COUNT(*)::int AS n,COALESCE(SUM(amount),0) AS total FROM trip_cost_items WHERE trip_id=$1',[trip.id]);
 if(Number(c.n)===0){if(!trip.is_sample)throw problem('Enter the estimated cost breakdown before opening registration');return;}
 if(Math.abs(Number(c.total)-Number(trip.estimated_cost))>0.01 && !String(trip.estimated_budget_note||'').trim())throw problem('Estimated breakdown differs from the total; record a budget explanation');
}
async function itineraryReady(t,trip){
 const x=await t.one('SELECT COUNT(*)::int AS n FROM itineraries WHERE trip_id=$1 AND length(trim(title))>0',[trip.id]);
 if(!x.n)throw problem('A proposed itinerary is required');
}
async function coordinatorAction(tripId,userId,action){
 return getDb().tx(async t=>{
  const trip=await lockedTrip(t,tripId);
  if(!trip)throw problem('Trip not found',404);
  if(action!=='close')eligible(trip);
  const a=await t.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active' AND assignment_role IN ('lead','assistant')`,[tripId,userId]);
  if(!a)throw problem('Active Trip Coordinator assignment required',403);
  const lead=await t.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND status='active' AND assignment_role='lead'`,[tripId]);
  if(!lead)throw problem('An active lead Coordinator is required',409);
  const c=await counts(t,tripId);
  if(action==='open'){
   if(trip.vacancies_held_closed)throw problem('Vacancy must be explicitly reopened using Reopen Available Slot',409);
   if(Number(c.occupied)>=trip.max_participants)throw problem('Slots Full',409);
   for(const key of ['title','purpose','description','meeting_point','meeting_time','transport_information','safety_information','emergency_contact_name','emergency_contact_phone'])if(!String(trip[key]||'').trim())throw problem(`Complete the required trip field: ${key}`);
   await itineraryReady(t,trip);await costReady(t,trip);
   await t.none('UPDATE trips SET registration_open=TRUE,updated_at=NOW() WHERE id=$1',[tripId]);
  }else if(action==='close'){
   await t.none('UPDATE trips SET registration_open=FALSE,updated_at=NOW() WHERE id=$1',[tripId]);
  }else if(action==='reopen'){
   if(!trip.vacancies_held_closed)throw problem('There is no held vacancy to reopen',409);
   if(Number(c.occupied)>=trip.max_participants)throw problem('There is no available vacancy',409);
   await itineraryReady(t,trip);await costReady(t,trip);
   await t.none('UPDATE trips SET vacancies_held_closed=FALSE,updated_at=NOW() WHERE id=$1',[tripId]);
  }else throw problem('Unsupported registration action');
  await t.none(`INSERT INTO registration_events(trip_id,actor_id,action) VALUES ($1,$2,$3)`,[tripId,userId,action]);
  return {action};
 });
}
async function join(tripId,userId,reason,document,storageKey){
 if(!String(reason||'').trim()||String(reason).length>1000)throw problem('Enter a joining reason (up to 1000 characters)');
 if(!document||!storageKey)throw problem('A valid parent/guardian consent letter is required');
 return getDb().tx(async t=>{
  const trip=await lockedTrip(t,tripId);eligible(trip,new Date(),{requireVisible:true});
  if(!trip.registration_open||trip.vacancies_held_closed)throw problem('Registration is closed; a Coordinator must reopen any held vacancy',409);
  const lead=await t.oneOrNone(`SELECT 1 FROM trip_coordinators WHERE trip_id=$1 AND status='active' AND assignment_role='lead'`,[tripId]);
  if(!lead)throw problem('Trip has no active lead Coordinator',409);
  const c=await counts(t,tripId);
  if(Number(c.occupied)>=Number(trip.max_participants))throw problem('Slots Full',409);
  const previous=await t.oneOrNone('SELECT id,status FROM participants WHERE trip_id=$1 AND user_id=$2 FOR UPDATE',[tripId,userId]);
  if(previous && !['withdrawn','rejected'].includes(previous.status))throw problem('You already have an active request for this trip',409);
  if(previous?.status==='rejected')throw problem('A rejected request cannot be submitted again without Coordinator review',409);
  const p=previous?await t.one(`UPDATE participants SET status='pending',reason=$3,requested_at=NOW(),withdrawn_at=NULL,withdrawal_reason=NULL,reviewed_at=NULL,reviewed_by=NULL,decision_note=NULL WHERE id=$1 AND user_id=$2 RETURNING id`,[previous.id,userId,reason]):await t.one(`INSERT INTO participants(trip_id,user_id,reason,status) VALUES($1,$2,$3,'pending') RETURNING id`,[tripId,userId,reason]);
  const v=await t.one('SELECT COALESCE(MAX(version_number),0)::int+1 AS v FROM participant_consent_documents WHERE participant_id=$1',[p.id]);
  await t.none('UPDATE participant_consent_documents SET is_current=FALSE WHERE participant_id=$1 AND is_current=TRUE',[p.id]);
  await t.none(`INSERT INTO participant_consent_documents(trip_id,participant_id,student_user_id,original_filename,storage_key,detected_mime_type,file_size,version_number,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$3)`,[tripId,p.id,userId,document.name,storageKey,document.mime,document.size,v.v]);
  return p.id;
 });
}
async function withdraw(tripId,userId,reason){
 if(!String(reason||'').trim()||String(reason).length>800)throw problem('Enter a withdrawal reason (up to 800 characters)');
 return getDb().tx(async t=>{
  const trip=await lockedTrip(t,tripId);
  if(!trip||['completed','cancelled'].includes(trip.operational_status)||new Date(trip.start_date).toISOString().slice(0,10)<=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Thimphu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))throw problem('This trip can no longer accept withdrawals',409);
  const p=await t.oneOrNone(`SELECT id,status FROM participants WHERE trip_id=$1 AND user_id=$2 FOR UPDATE`,[tripId,userId]);
  if(!p||!['pending','approved'].includes(p.status))throw problem('No active request to withdraw',409);
  await t.none(`UPDATE participants SET status='withdrawn',withdrawn_at=NOW(),withdrawal_reason=$2 WHERE id=$1`,[p.id,reason]);
  // A freed seat never becomes bookable automatically once all seats were occupied.
  await t.none(`UPDATE trips SET vacancies_held_closed=TRUE,updated_at=NOW() WHERE id=$1`,[tripId]);
  // Database Step 12A trigger invalidates any cleared or pending snapshot for approved departures.
  await t.none(`INSERT INTO registration_events(trip_id,actor_id,action,participant_id,reason) VALUES ($1,$2,'withdraw',$3,$4)`,[tripId,userId,p.id,reason]);
  return p.id;
 });
}
async function myTrips(userId){return getDb().any(`SELECT p.id,p.status,p.reason,p.requested_at,p.withdrawn_at,t.id AS trip_id,t.title,t.start_date,t.end_date,t.registration_deadline,d.name AS destination_name, c.verification_status AS consent_status FROM participants p JOIN trips t ON t.id=p.trip_id JOIN destinations d ON d.id=t.destination_id LEFT JOIN participant_consent_documents c ON c.participant_id=p.id AND c.is_current=TRUE WHERE p.user_id=$1 ORDER BY p.requested_at DESC`,[userId]);}
async function myRequest(tripId,userId){return getDb().oneOrNone(`SELECT p.*,c.verification_status AS consent_status FROM participants p LEFT JOIN participant_consent_documents c ON c.participant_id=p.id AND c.is_current=TRUE WHERE p.trip_id=$1 AND p.user_id=$2`,[tripId,userId]);}
module.exports={eligible,coordinatorAction,join,withdraw,myTrips,myRequest,problem};
