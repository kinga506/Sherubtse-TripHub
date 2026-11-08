const Proposal=require('../models/Proposal');
const ID=/^[1-9]\d*$/;
function uiDate(value){if(!value)return '';if(value instanceof Date)return value.toISOString().slice(0,10);return String(value).slice(0,10);}
function formData(data={}){const o={...data};o.start_date=uiDate(o.start_date);o.end_date=uiDate(o.end_date);if(o.registration_deadline){const d=new Date(o.registration_deadline);o.registration_deadline=Number.isNaN(d.getTime())?'':new Date(d.getTime()+6*3600000).toISOString().slice(0,16);}o.meeting_time=String(o.meeting_time||'').slice(0,5);return o;}
async function list(req,res,next){try{res.render('proposals/list',{title:'My Trip Proposals',proposals:await Proposal.owned(req.currentUser.id)});}catch(e){next(e);}}
async function renderEditor(req,res,next,options={}){try{
 const isEdit=Boolean(req.params.tripId),id=req.params.tripId;
 if(isEdit&&!ID.test(id))return res.status(404).send('Proposal not found');
 let record=null;
 if(isEdit){record=await Proposal.getAll(id,req.currentUser.id);if(!record)return res.status(404).send('Proposal not found');if(!['draft','changes_requested'].includes(record.trip.approval_status))return res.status(403).send('Proposal is locked for DSA review');}
 res.status(options.status||200).render('proposals/editor',{title:isEdit?'Edit Trip Proposal':'Organise a Trip',tripId:id||null,destinations:await Proposal.destinations(),values:options.values||formData(record?.trip||{}),itinerary:options.itinerary||record?.itinerary||[],costs:options.costs||record?.costs||[],errors:options.errors||[],notice:options.notice||null,approvalStatus:record?.trip.approval_status||'draft'});
 }catch(e){next(e);}}
async function save(req,res,next){try{
 const id=req.params.tripId||null;
 if(id&&!ID.test(id))return res.status(404).send('Proposal not found');
 if(id&&!await Proposal.getEditable(id,req.currentUser.id))return res.status(403).send('Proposal cannot be edited');
 const validated=Proposal.validate(req.body);
 if(validated.errors.length)return renderEditor(req,res,next,{status:422,values:req.body,itinerary:validated.itinerary,costs:validated.costs,errors:validated.errors});
 const savedId=await Proposal.save(req.currentUser.id,id,validated);
 return res.redirect(`/workspace/proposals/${savedId}/preview`);
 }catch(e){if(e.status===400)return res.status(400).send(e.message);next(e);}}
async function preview(req,res,next){try{
 if(!ID.test(req.params.tripId))return res.status(404).send('Proposal not found');
 const result=await Proposal.getAll(req.params.tripId,req.currentUser.id);
 if(!result)return res.status(404).send('Proposal not found');
 const {trip,itinerary,costs}=result;
 const validation=Proposal.validate({...formData(trip),itinerary,costs},{strict:true});
 const destinationList=await Proposal.destinations();const destination=destinationList.find(d=>Number(d.id)===Number(trip.destination_id));
 
res.render('proposals/preview', {
  title: 'Proposal Preview',
  trip,
  values: formData(trip),
  itinerary,
  costs,
  destination,
  errors: validation.errors,

  submittedNow:
    req.query.submitted === '1' &&
    trip.approval_status === 'pending_dsa',

  canEdit: ['draft', 'changes_requested'].includes(
    trip.approval_status
  )
});

 }catch(e){next(e);}}
module.exports={list,renderEditor,save,preview};
