const {getDb}=require('../config/db');
const {validId}=require('../models/Access');
const {current}=require('../models/FinalNamelist');
const DAY="(NOW() AT TIME ZONE 'Asia/Thimphu')::date";
async function reconcileOne(tripId){
 if(!validId(tripId))return null;
 const db=getDb();
 // The trip row lock serializes status transitions with cancellation and final-report submission.
 return db.tx(async t=>{
  const trip=await t.oneOrNone(`SELECT *,start_date<=${DAY} AS started,end_date<${DAY} AS ended FROM trips WHERE id=$1 FOR UPDATE`,[tripId]);
  if(!trip || !trip.is_active || trip.approval_status!=='approved'||['completed','cancelled'].includes(trip.operational_status))return null;
  if(trip.ended){
   await t.none("UPDATE trips SET operational_status='awaiting_final_report',registration_open=FALSE,updated_at=NOW() WHERE id=$1 AND operational_status<>'awaiting_final_report'",[tripId]);
   if(trip.registration_open)await t.none('UPDATE trips SET registration_open=FALSE,updated_at=NOW() WHERE id=$1',[tripId]);
   await t.none(`INSERT INTO trip_lifecycle_events(trip_id,action,reason) VALUES($1,'awaiting_final_report','End date has passed') ON CONFLICT DO NOTHING`,[tripId]);
   return 'awaiting_final_report';
  }
  if(trip.registration_open && new Date(trip.registration_deadline).getTime()<=Date.now()){
   await t.none('UPDATE trips SET registration_open=FALSE,updated_at=NOW() WHERE id=$1',[tripId]);
  }
  if(trip.started && trip.operational_status==='planned'){
   // Separate check compares full immutable roster and consent versions.
   const clearance=await current(tripId);
   if(!clearance.cleared){
    await t.none('UPDATE trips SET registration_open=FALSE WHERE id=$1',[tripId]);
    const flag=await t.oneOrNone(`INSERT INTO trip_lifecycle_events(trip_id,action,reason) VALUES($1,'departure_blocked','Current DSA-approved final namelist clearance is missing') ON CONFLICT DO NOTHING RETURNING id`,[tripId]);
    if(flag)await t.none(`INSERT INTO trip_lifecycle_notifications(event_id,recipient_user_id,subject,message)
      SELECT $1,id,$2,$3 FROM users WHERE role='dsa' AND is_active=TRUE AND is_verified=TRUE ON CONFLICT DO NOTHING`,
      [flag.id,`Departure blocked: ${trip.title}`,`TripHub has blocked departure for ${trip.title}: the current final namelist lacks DSA clearance. Review the trip before any travel.`]);
    return 'departure_blocked';
   }
   // The Step 12A database trigger separately rejects stale or missing clearance.
   await t.none("UPDATE trips SET operational_status='ongoing',registration_open=FALSE,updated_at=NOW() WHERE id=$1",[tripId]);
   await t.none(`INSERT INTO trip_lifecycle_events(trip_id,action,reason) VALUES($1,'started','Valid final-namelist clearance') ON CONFLICT DO NOTHING`,[tripId]);
   return 'ongoing';
  }
  return trip.operational_status;
 });
}
async function reconcileAll(batchSize=100){
 const rows=await getDb().any(`SELECT id FROM trips WHERE is_active=TRUE AND approval_status='approved'
 AND operational_status IN ('planned','ongoing','awaiting_final_report')
 AND (end_date<${DAY} OR (start_date<=${DAY} AND operational_status='planned') OR
 (registration_deadline<NOW() AND registration_open=TRUE)) ORDER BY id LIMIT $1`,[batchSize]);
 const results=[];
 for(const trip of rows){try{results.push({tripId:trip.id,status:await reconcileOne(trip.id)});}catch(err){results.push({tripId:trip.id,error:err.message});}}
 return results;
}
function requestTimeReconcile(req,res,next){
 // Narrow scope: only URLs with an actual trip identifier. Public listing is handled by optional cron.
 const match=req.path.match(/^\/(?:workspace\/)?trips\/(\d+)(?:\/|$)/);
 if(!match)return next();
 reconcileOne(match[1]).then(()=>next(),next);
}
module.exports={reconcileOne,reconcileAll,requestTimeReconcile};
