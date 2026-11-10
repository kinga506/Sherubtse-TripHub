const DsaTransition=require('../models/DsaTransition');
const asyncHandler=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const dashboard=asyncHandler(async(req,res)=>res.render('admin/dsa-transitions',{title:'DSA Transition Management',...await DsaTransition.dashboard(req.query),notice:req.query.notice||null,errorMessage:req.query.error||null}));
const begin=asyncHandler(async(req,res)=>{
 try{
  const transition=await DsaTransition.initiate(req.body,req.currentUser.id);
  if(transition.status==='awaiting_activation')return res.redirect('/workspace/superadmin/dsa-transitions?notice=awaiting-activation');
  return res.redirect(`/workspace/superadmin/dsa-transitions/${transition.id}/review`);
 }catch(error){
  if(error.status||error.code==='23505'){
   await DsaTransition.auditRejected(req.currentUser.id,'dsa_transition_initiation_rejected',/^\d+$/.test(String(req.body.outgoingDsaId))?req.body.outgoingDsaId:null,error.status||409);
   return res.redirect(`/workspace/superadmin/dsa-transitions?error=${encodeURIComponent(error.status?error.message:'One of these accounts is already part of an unfinished transition.')}`);
  }
  throw error;
 }
});
const review=asyncHandler(async(req,res)=>{
 const transition=await DsaTransition.transitionById(req.params.id);
 if(!transition)return res.sendStatus(404);
 return res.render('admin/dsa-transition-review',{title:'Review DSA Transition',transition,errorMessage:req.query.error||null});
});
const complete=asyncHandler(async(req,res)=>{
 if(req.body.confirmation!=='COMPLETE')return res.redirect(`/workspace/superadmin/dsa-transitions/${req.params.id}/review?error=${encodeURIComponent('Type COMPLETE to confirm this transition.')}`);
 try{await DsaTransition.complete(req.params.id,req.currentUser.id);return res.redirect('/workspace/superadmin/dsa-transitions?notice=transition-completed');}
 catch(error){if(error.status){await DsaTransition.auditRejected(req.currentUser.id,'dsa_transition_completion_rejected',req.params.id,error.status);return res.redirect(`/workspace/superadmin/dsa-transitions/${req.params.id}/review?error=${encodeURIComponent(error.message)}`);}throw error;}
});
const emergencyRevoke=asyncHandler(async(req,res)=>{
 if(req.body.confirmation!=='REVOKE')return res.redirect(`/workspace/superadmin/dsa-transitions?error=${encodeURIComponent('Type REVOKE to confirm emergency access revocation.')}`);
 try{const result=await DsaTransition.emergencyRevoke(req.body.dsaId,req.body.reason,req.currentUser.id);return res.redirect(`/workspace/superadmin/dsa-transitions?notice=${result.remainingActiveDsa===0?'emergency-last-dsa':'emergency-revoked'}`);}
 catch(error){if(error.status){await DsaTransition.auditRejected(req.currentUser.id,'dsa_emergency_revocation_rejected',/^\d+$/.test(String(req.body.dsaId))?req.body.dsaId:null,error.status);return res.redirect(`/workspace/superadmin/dsa-transitions?error=${encodeURIComponent(error.message)}`);}throw error;}
});
module.exports={dashboard,begin,review,complete,emergencyRevoke};
