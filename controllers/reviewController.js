const R=require('../models/ProposalReview');
const Proposal=require('../models/Proposal');
const Access=require('../models/Access');
const {getStorage}=require('../config/storage');
const {inspect,safeDownloadName}=require('../services/attachmentValidation');
const valid=Access.validId;
const issue=(res,e,next)=>e.status?res.status(e.status).send(e.message):next(e);
function idOr404(req,res){if(!valid(req.params.tripId)) {res.status(404).send('Trip not found');return false;}return true;}
async function attachmentsPage(req,res,next){try{
 if(!idOr404(req,res))return;
 const files=await R.attachments(req.params.tripId);
 const recent=await R.latestSubmission(req.params.tripId);
 res.render('proposals/attachments',{title:'Supporting Documents',tripId:req.params.tripId,files,recent});
}catch(e){next(e);}}
async function upload(req,res,next){let stored;
 try{
  if(!idOr404(req,res))return;
  const title=String(req.body.document_title||'').trim();const description=String(req.body.description||'').trim();
  if(!title||title.length>160||description.length>500)return res.status(422).send('Document title required (up to 160 characters); description up to 500 characters');
  const meta=await inspect(req.file);meta.title=title;meta.description=description;
  const storage=getStorage();stored=await storage.put(req.file.buffer,meta.mime);
  await R.addAttachment(Number(req.params.tripId),req.currentUser.id,meta,stored.key);
  return res.redirect(`/workspace/proposals/${req.params.tripId}/attachments`);
 }catch(e){if(stored)try{await getStorage().delete(stored.key);}catch(error){console.error('Orphan attachment cleanup failed',error.message);}return issue(res,e,next);}
}
async function remove(req,res,next){try{
 if(!idOr404(req,res)||!valid(req.params.attachmentId))return res.status(404).send('Not found');
 await R.supersedeAttachment(Number(req.params.tripId),Number(req.params.attachmentId),req.currentUser.id);
 res.redirect(`/workspace/proposals/${req.params.tripId}/attachments`);
}catch(e){issue(res,e,next);}}
async function download(req,res,next){try{
 if(!idOr404(req,res)||!valid(req.params.attachmentId))return res.status(404).send('Not found');
 const a=await R.getAttachment(Number(req.params.tripId),Number(req.params.attachmentId));if(!a)return res.status(404).send('Not found');
 const user=req.currentUser;if(!user)return res.status(401).send('Authentication required');
 // Owner can see their own upload versions; assigned Coordinators can see approved-trip documents;
 // DSA can view only versions that were actually submitted. Never publish object keys.
 let allowed=user.role==='student'&&Number(a.proposed_by_user_id)===Number(user.id);
 if(!allowed&&user.role==='student'&&a.approval_status==='approved')allowed=Boolean(await Access.activeAssignment(a.trip_id,user.id));
 if(!allowed&&user.role==='dsa') {
  const {getDb}=require('../config/db');
  allowed=Boolean(await getDb().oneOrNone(`SELECT 1 FROM trip_submission_attachments sa JOIN trip_submissions s ON s.id=sa.submission_id WHERE sa.attachment_id=$1 AND s.trip_id=$2 LIMIT 1`,[a.id,a.trip_id]));
 }
 if(!allowed)return res.status(403).send('Access denied');
 const bytes=await getStorage().get(a.storage_key);
 res.set('Content-Type',a.detected_mime_type);
 res.set('Content-Disposition',`attachment; filename="${safeDownloadName(a.original_filename)}"`);
 res.set('Cache-Control','private, no-store');res.set('X-Content-Type-Options','nosniff');return res.send(bytes);
}catch(e){next(e);}}
async function submit(req,res,next){try{
 if(!idOr404(req,res))return;
 await R.submit(Number(req.params.tripId),req.currentUser.id);
 res.redirect(
  `/workspace/proposals/${req.params.tripId}/preview?submitted=1`
);
}catch(e){issue(res,e,next);}}
async function dsaQueue(req,res,next){try{res.render('dsa/queue',{title:'DSA Proposal Review',trips:await R.queue()});}catch(e){next(e);}}
async function dsaReview(req,res,next){try{
 if(!idOr404(req,res))return;
 const version=req.query.version===undefined?null:Number(req.query.version);
 if(version!==null&&(!Number.isSafeInteger(version)||version<1))return res.status(400).send('Invalid submission version');
 const data=await R.reviewData(Number(req.params.tripId),version);if(!data||!data.sub)return res.status(404).send('No submitted proposal');
 res.render('dsa/review',{title:'DSA Review',...data,students:await R.eligibleStudents()});
}catch(e){next(e);}}
async function decision(req,res,next){try{
 if(!idOr404(req,res))return;
 await R.decide(Number(req.params.tripId),req.currentUser.id,String(req.body.decision||''),req.body.remarks,req.body.lead_user_id,req.body.assistants);
 res.redirect(`/workspace/dsa/proposals/${req.params.tripId}`);
}catch(e){issue(res,e,next);}}
async function handover(req,res,next){try{
 if(!idOr404(req,res))return;
 await R.reassign(Number(req.params.tripId),req.currentUser.id,req.body.lead_user_id,req.body.assistants,String(req.body.reason||'').trim());
 res.redirect(`/workspace/dsa/proposals/${req.params.tripId}`);
}catch(e){issue(res,e,next);}}
async function requestHandover(req,res,next){try{
 if(!idOr404(req,res))return;
 await R.requestHandover(Number(req.params.tripId),req.currentUser.id,req.body.reason);
 res.redirect('/workspace/coordinating-trips');
}catch(e){issue(res,e,next);}}
function formDate(value){if(!value)return '';return (value instanceof Date?value.toISOString():String(value)).slice(0,10);}
async function revisionForm(req,res,next){try{
 const id=Number(req.params.tripId);
 const {getDb}=require('../config/db');
 const trip=await getDb().one('SELECT * FROM trips WHERE id=$1',[id]);
 const [itinerary,costs,destinations]=await Promise.all([getDb().any(`SELECT day_number,to_char(start_time,'HH24:MI') AS start_time,title,description FROM itineraries WHERE trip_id=$1 ORDER BY day_number,sort_order,id`,[id]),getDb().any('SELECT label,amount FROM trip_cost_items WHERE trip_id=$1 ORDER BY sort_order,id',[id]),Proposal.destinations()]);
 const values={...trip,start_date:formDate(trip.start_date),end_date:formDate(trip.end_date),meeting_time:String(trip.meeting_time||'').slice(0,5),registration_deadline:new Date(trip.registration_deadline.getTime()+6*3600000).toISOString().slice(0,16)};
 res.render('proposals/editor',{title:'Submit material revision',tripId:id,approvalStatus:trip.approval_status,values,itinerary,costs,destinations,errors:[],notice:null,actionOverride:`/workspace/trips/${id}/revise`});
}catch(e){next(e);}}
async function revisionSubmit(req,res,next){try{
 const validated=Proposal.validate(req.body,{strict:true});
 if(validated.errors.length)return res.status(422).send(validated.errors.join('; '));
 await Proposal.save(req.currentUser.id,Number(req.params.tripId),validated,{materialRevision:true});
 res.redirect('/workspace/coordinating-trips');
}catch(e){issue(res,e,next);}}
module.exports={attachmentsPage,upload,remove,download,submit,dsaQueue,dsaReview,decision,handover,requestHandover,revisionForm,revisionSubmit};
