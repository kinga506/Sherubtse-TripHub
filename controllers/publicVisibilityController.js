const PublicTrip=require('../models/PublicTrip');
const Access=require('../models/Access');

async function change(req,res,next){
 const tripId=req.params.tripId;
 const action=String(req.body.action||'');
 if(!['hide','show'].includes(action))return res.status(422).send('Choose Hide or Show public visibility');
 try{
  await PublicTrip.setVisibility(Number(tripId),req.currentUser.id,action==='hide',req.body.reason);
  return res.redirect(`/workspace/coordinating-trips?visibility=${action==='hide'?'hidden':'shown'}`);
 }catch(error){
  if(error.status)return res.status(error.status).send(error.message);
  return next(error);
 }
}

async function coordinating(req,res,next){
 try{
  const trips=await Access.coordinatingTripIds(req.currentUser.id);
  const notice=['hidden','shown'].includes(req.query.visibility)?req.query.visibility:null;
  return res.render('coordinators/list',{title:'My Coordinating Trips',trips,visibilityNotice:notice});
 }catch(error){return next(error);}
}

module.exports={change,coordinating};
