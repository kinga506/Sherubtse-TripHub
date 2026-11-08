const Finance=require('../models/Finance');
async function page(req,res,next){try{
 const data=await Finance.overview(Number(req.params.tripId),req.currentUser.id);
 res.set('Cache-Control','private, no-store');
 res.render('trips/finance',{title:'Trip finances',...data,errorMessage:req.query.error||'',successMessage:req.query.saved?'Financial record saved.':''});
}catch(e){if(e.status)return res.status(e.status).send(e.message);next(e);}}
async function save(req,res,next){try{
 const tripId=Number(req.params.tripId),userId=req.currentUser.id;
 const id=req.params.recordId;
 if(req.params.kind==='expenses')await Finance.saveExpense(tripId,userId,req.body,id);
 else if(req.params.kind==='contributions')await Finance.saveContribution(tripId,userId,req.body,id);
 else return res.status(404).send('Unknown financial record type');
 res.redirect(`/workspace/trips/${tripId}/finance?saved=1`);
}catch(e){if(e.status&&e.status<500)return res.status(e.status).send(e.message);next(e);}}
module.exports={page,save};
