const J=require('../models/JoinReview');
const Access=require('../models/Access');
const {inspect,safeDownloadName}=require('../services/attachmentValidation');
const {getStorage}=require('../config/storage');
function error(res,e,next){if(e.status)return res.status(e.status).send(e.message);return next(e);}
function ids(...args){return args.every(Access.validId);}
async function requests(req,res,next){try{
 const tripId=Number(req.params.tripId);
 const [items,extensions]=await Promise.all([J.list(tripId),J.extensionsForTrip(tripId)]);
 res.render('trips/join-requests',{title:'Join requests',trip:req.authorizedTrip,requests:items,extensions});
}catch(e){next(e);}}
async function consentReview(req,res,next){try{
 if(!ids(req.params.tripId,req.params.participantId))return res.status(400).send('Invalid ID');
 await J.reviewConsent(Number(req.params.tripId),Number(req.params.participantId),req.currentUser.id,String(req.body.action||''),req.body.note);
 res.redirect(`/workspace/trips/${req.params.tripId}/requests`);
}catch(e){error(res,e,next);}}
async function decision(req,res,next){try{
 if(!ids(req.params.tripId,req.params.participantId))return res.status(400).send('Invalid ID');
 await J.decision(Number(req.params.tripId),Number(req.params.participantId),req.currentUser.id,String(req.body.action||''),req.body.note);
 res.redirect(`/workspace/trips/${req.params.tripId}/requests`);
}catch(e){error(res,e,next);}}
async function replacement(req,res,next){let saved;try{
 if(!ids(req.params.tripId))return res.status(400).send('Invalid trip ID');
 if(!req.file)return res.status(422).send('Upload corrected consent letter');
 const meta=await inspect(req.file);
 if(!['application/pdf','image/jpeg','image/png'].includes(meta.mime))return res.status(422).send('Consent must be PDF, JPG or PNG');
 saved=await getStorage().put(req.file.buffer,meta.mime);
 await J.replaceConsent(Number(req.params.tripId),req.currentUser.id,meta,saved.key);
 res.redirect('/workspace/my-trips');
}catch(e){if(saved)try{await getStorage().delete(saved.key);}catch(clean){console.error('Orphan consent cleanup failed',clean.message);}error(res,e,next);}}
async function download(req,res,next){try{
 if(!ids(req.params.tripId,req.params.participantId,req.params.docId))return res.status(400).send('Invalid ID');
 const d=await J.downloadConsent(Number(req.params.tripId),Number(req.params.participantId),Number(req.params.docId),req.currentUser.id);
 const bytes=await getStorage().get(d.storage_key);
 res.set('Cache-Control','private, no-store');res.set('Content-Type',d.detected_mime_type);res.attachment(safeDownloadName(d.original_filename));res.send(bytes);
}catch(e){error(res,e,next);}}
async function requestExtension(req,res,next){try{
 await J.requestExtension(Number(req.params.tripId),req.currentUser.id,req.body.proposed_deadline,req.body.reason);
 res.redirect(`/workspace/trips/${req.params.tripId}/requests`);
}catch(e){error(res,e,next);}}
async function queue(req,res,next){try{res.render('dsa/deadline-extensions',{title:'Replacement deadline requests',requests:await J.extensionQueue()});}catch(e){next(e);}}
async function extensionDecision(req,res,next){try{
 if(!ids(req.params.extensionId))return res.status(400).send('Invalid ID');
 await J.decideExtension(Number(req.params.extensionId),req.currentUser.id,req.body.action,req.body.note);
 res.redirect('/workspace/dsa/deadline-extensions');
}catch(e){error(res,e,next);}}
module.exports={requests,consentReview,decision,replacement,download,requestExtension,queue,extensionDecision};
