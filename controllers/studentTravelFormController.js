'use strict';
const Model=require('../models/StudentTravelForm');
const pdf=require('../services/pdf/studentTravelForm');
const {validId}=require('../models/Access');
function fail(err,res,next){if(err.status)return res.status(err.status).send(err.message);next(err);}
async function page(req,res,next){try{
 const record=await Model.data(Number(req.params.tripId));
 const fields=pdf.buildFields(record.trip,record.lead);
 res.render('trips/student-travel-form',{title:'Official Student Travel Form',...record,fields,missing:pdf.missing(fields)});
}catch(err){fail(err,res,next);}}
async function create(req,res,next){try{
 const created=await Model.create(Number(req.params.tripId),req.currentUser.id,req.body);
 res.redirect(`/workspace/trips/${req.params.tripId}/student-travel-form?generated=${created.id}`);
}catch(err){fail(err,res,next);}}
async function download(req,res,next){try{
 if(!validId(req.params.formId))return res.status(400).send('Invalid form ID');
 const {record,bytes}=await Model.getForm(Number(req.params.formId),req.currentUser.id);
 res.set('Cache-Control','private, no-store');res.type('application/pdf');res.set('X-Content-Type-Options','nosniff');
 const disposition=req.query.preview==='1'?'inline':'attachment';
 res.set('Content-Disposition',`${disposition}; filename="sherubtse-student-travel-form-trip-${record.trip_id}-v${record.form_version}.pdf"`);
 res.send(bytes);
}catch(err){fail(err,res,next);}}
module.exports={page,create,download};
