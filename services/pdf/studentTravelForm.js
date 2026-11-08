'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {PDFDocument, StandardFonts, rgb} = require('pdf-lib');
const TEMPLATE = path.resolve(__dirname,'../../private_templates/Student-Travel-Form.pdf');
const MAX_ROWS=30;
function asText(value){return value===null||value===undefined?'':String(value).trim();}
function clean(value,limit=90){return asText(value).replace(/[\x00-\x1f\x7f]/g,' ').slice(0,limit);}
function day(value){if(!value)return '';const s=asText(value);if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);}
function time(value){return asText(value).slice(0,5);}
function buildFields(trip,lead,details={}){
 return {
  organizerName:clean(lead?.name,42), programme:clean(lead?.programme,45), year:clean(lead?.academic_year,4),
  contact:clean(lead?.phone||details.contact,25), dateOfTravel:day(trip.start_date),
  timeOfTravel:time(details.timeOfTravel), destination:clean(trip.destination_name,40),
  via:clean(details.via,48), vehicleType:clean(details.vehicleType,30), vehicleNumber:clean(details.vehicleNumber,30),
  driverNameAndLicense:clean(details.driverNameAndLicense,60)
 };
}
const REQUIRED=['organizerName','programme','year','contact','dateOfTravel','timeOfTravel','destination','via','vehicleType','vehicleNumber','driverNameAndLicense'];
function missing(fields){return REQUIRED.filter(key=>!fields[key]);}
function fit(page,text,x,top,width,maxSize=9){
 const value=clean(text,100);if(!value)return;
 const font=page._triphubFont;let size=maxSize;
 while(size>5.2&&font.widthOfTextAtSize(value,size)>width)size-=0.3;
 const printable=font.widthOfTextAtSize(value,size)<=width?value:value.slice(0,Math.max(1,Math.floor(value.length*width/font.widthOfTextAtSize(value,size))-2))+'…';
 page.drawText(printable.replace(/[^\x20-\x7e]/g,'?'),{x,y:page.getHeight()-top,size,font,color:rgb(.05,.15,.19)});
}
async function generate(templateBytes,fields,participants){
 if(!Array.isArray(participants)||participants.length>MAX_ROWS)throw new Error('The official Student Travel Form supports at most 30 approved participants');
 const doc=await PDFDocument.load(templateBytes,{updateMetadata:false});
 if(doc.getPageCount()!==2)throw new Error('Expected the two-page official Student Travel Form template');
 const font=await doc.embedFont(StandardFonts.Helvetica);
 const [a,b]=doc.getPages();a._triphubFont=font;b._triphubFont=font;
 // The supplied official A4 pages are unchanged; write only onto blank form lines/cells.
 // Coordinates are top-origin A4 points, measured against the uploaded 2025 form.
 const positions={
  organizerName:[106,216,110],programme:[300,216,190],year:[49,248,50],contact:[166,248,89],dateOfTravel:[373,248,125],
  timeOfTravel:[151,277,61],destination:[287,277,86],via:[406,277,95],
  vehicleType:[153,307,92],vehicleNumber:[329,307,130],driverNameAndLicense:[252,337,130]
 };
 for(const [key,[x,y,w]] of Object.entries(positions))fit(a,fields[key],x,y,w,9);
 for(let i=0;i<participants.length;i++){
  const p=participants[i],page=i<24?a:b,idx=i<24?i:i-24;
  const top=i<24?416+14.7*idx:130+14.7*idx;
  fit(page,p.name,73,top,153,8);
  fit(page,p.programme,234,top,111,7.5);
  fit(page,p.academic_year,355,top,42,8);
  fit(page,p.residence_hall,413,top,67,7.5);
  fit(page,p.destination||fields.destination,488,top,81,7.0);
 }
 return Buffer.from(await doc.save());
}
async function generateFromTemplate(fields,participants){return generate(await fs.readFile(TEMPLATE),fields,participants);}
module.exports={TEMPLATE,MAX_ROWS,buildFields,missing,generate,generateFromTemplate,day,time};
