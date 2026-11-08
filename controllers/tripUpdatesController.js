const M=require('../models/TripUpdates');
const Access=require('../models/Access');
function sendError(e,res,next){if(e.status)return res.status(e.status).send(e.message);next(e);}
async function canRead(user,trip){
 if(!trip)return false;
 if(user.role==='dsa')return trip.approval_status!=='draft';
 if(user.role!=='student')return false;
 if(trip.approval_status==='approved'&&await Access.approvedParticipation(trip.id,user.id))return true;
 return Boolean(await Access.activeAssignment(trip.id,user.id));
}
async function page(req,res,next){try{
 const id=Number(req.params.tripId),data=await M.snapshot(id);
 if(!data.trip)return res.status(404).send('Trip not found');
 if(!await canRead(req.currentUser,data.trip))return res.status(403).send('Access denied');
 const assignment=req.currentUser.role==='student'?await Access.activeAssignment(id,req.currentUser.id):null;
 const canEdit=Boolean(assignment&&data.trip.approval_status==='approved'&&data.trip.is_active&&!['completed','cancelled','awaiting_final_report'].includes(data.trip.operational_status));
 res.set('Cache-Control','private, no-store');
 res.render('trips/updates',{title:'Trip itinerary and announcements',...data,canEdit});
 }catch(e){next(e);}}
async function saveActivity(req,res,next){try{
 const activityId=req.params.activityId;
 if(activityId&&!M.validId(activityId))return res.status(400).send('Invalid activity');
 await M.editActivity(Number(req.params.tripId),req.currentUser.id,activityId?Number(activityId):null,req.body);
 res.redirect(`/workspace/trips/${req.params.tripId}/updates`);
 }catch(e){sendError(e,res,next);}}
async function removeActivity(req,res,next){try{
 if(!M.validId(req.params.activityId))return res.status(400).send('Invalid activity');
 await M.deleteActivity(Number(req.params.tripId),req.currentUser.id,Number(req.params.activityId));
 res.redirect(`/workspace/trips/${req.params.tripId}/updates`);
 }catch(e){sendError(e,res,next);}}
async function createAnnouncement(req,res,next){try{
 await M.createNotice(Number(req.params.tripId),req.currentUser.id,req.body);
 res.redirect(`/workspace/trips/${req.params.tripId}/updates#announcements`);
 }catch(e){sendError(e,res,next);}}
module.exports={page,saveActivity,removeActivity,createAnnouncement,canRead};
