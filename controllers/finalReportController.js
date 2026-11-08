const Report=require('../models/TripFinalReport');
const {reconcileOne}=require('../services/tripLifecycle');
const {getDb}=require('../config/db');
function failure(err,res,next){if(err.status&&err.status<500)return res.status(err.status).send(err.message);next(err);}
async function page(req,res,next){try{
 const id=req.params.tripId;
 const info=await Report.preview(id,req.currentUser.id,req.app.locals.enableMongo!==false);
 const role=req.currentUser.role;
 if(!info.canRead&&role!=='dsa'&&role!=='admin')return res.status(403).send('Access denied');
 res.set('Cache-Control','private, no-store');res.render('trips/final-report',{title:'Trip final report',...info});
}catch(err){failure(err,res,next);}}
async function submit(req,res,next){try{await reconcileOne(req.params.tripId);await Report.submit(req.params.tripId,req.currentUser.id,req.body,req.app.locals.enableMongo!==false);
 res.redirect(`/workspace/trips/${req.params.tripId}/final-report`);
}catch(err){failure(err,res,next);}}
async function dsaQueue(req,res,next){try{
 const db=getDb();const trips=await db.any(`SELECT t.id,t.title,t.operational_status,t.end_date,t.cancelled_at,t.cancellation_reason,
 r.submitted_at,r.id AS report_id FROM trips t LEFT JOIN trip_final_reports r ON r.trip_id=t.id
 WHERE t.approval_status='approved' ORDER BY t.end_date DESC,t.id DESC LIMIT 150`);
 res.set('Cache-Control','private, no-store');res.render('dsa/trip-lifecycle',{title:'Trip completion oversight',trips});
}catch(err){next(err);}}
async function cancel(req,res,next){try{
 await Report.cancellation(req.params.tripId,req.currentUser.id,req.body.reason);
 // Deliver outside the cancellation transaction; persisted outbox remains for retries.
 await Report.sendPendingNotifications().catch(err=>console.error('Notification retry deferred:',err.message));
 res.redirect('/workspace/dsa/trip-lifecycle');
}catch(err){failure(err,res,next);}}
module.exports={page,submit,dsaQueue,cancel};
