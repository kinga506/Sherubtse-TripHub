const Packing=require('../models/Packing');
function respondError(err,res,next){if(err.status)return res.status(err.status).json({error:err.message});next(err);}
async function page(req,res,next){try{
 const data=await Packing.context(Number(req.params.tripId),req.currentUser.id);
 res.set('Cache-Control','private, no-store');
 res.render('trips/packing',{title:'My packing checklist',...data});
 }catch(e){if(e.status)return res.status(e.status).send(e.message);next(e);}}
async function action(req,res,next){try{
 const id=Number(req.params.tripId),user=req.currentUser.id;
 let data;
 if(req.params.action==='add')data=await Packing.addItem(id,user,req.body);
 else if(req.params.action==='copy')data=await Packing.copySuggestions(id,user);
 else if(req.params.action==='toggle')data=await Packing.toggle(id,user,req.body.itemId,req.body.packed);
 else if(req.params.action==='remove')data=await Packing.removeItem(id,user,req.body.itemId);
 else return res.status(404).json({error:'Unknown action'});
 res.set('Cache-Control','no-store');res.json({ok:true,...(data||{})});
 }catch(e){respondError(e,res,next);}}
async function suggestion(req,res,next){try{
 const id=Number(req.params.tripId),user=req.currentUser.id;
 const data=req.params.action==='remove'?
 await Packing.manageSuggestion(id,user,null,req.body.suggestionId):
 await Packing.manageSuggestion(id,user,req.body);
 res.json({ok:true,...data});
 }catch(e){respondError(e,res,next);}}
module.exports={page,action,suggestion};
