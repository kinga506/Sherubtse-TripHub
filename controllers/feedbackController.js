const Feedback=require('../models/Feedback');
function respondError(error,res,next){if(error.status&&error.status<500)return res.status(error.status).send(error.message);next(error);}
async function studentPage(req,res,next){try{
 const data=await Feedback.studentPage(req.params.tripId,req.currentUser.id);
 res.set('Cache-Control','private, no-store');
 res.render('trips/feedback-student',{title:'Trip feedback',...data,saved:req.query.saved==='1'});
}catch(error){respondError(error,res,next);}}
async function submit(req,res,next){try{
 await Feedback.createFeedback({tripId:req.params.tripId,studentId:req.currentUser.id,
  rating:req.body.rating,comment:req.body.comment});
 res.redirect(`/workspace/trips/${req.params.tripId}/feedback?submitted=1`);
}catch(error){respondError(error,res,next);}}
async function coordinatorPage(req,res,next){try{
 const data=await Feedback.coordinatorPage(req.params.tripId,req.currentUser.id);
 res.set('Cache-Control','private, no-store');
 res.render('trips/feedback-coordinator',{title:'Trip feedback summary',...data});
}catch(error){respondError(error,res,next);}}
module.exports={studentPage,submit,coordinatorPage};
