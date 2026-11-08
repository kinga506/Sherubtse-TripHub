const {getDb}=require('../config/db');

const FIELDS=['title','purpose','description','destination_id','start_date','end_date','meeting_point','meeting_time','transport_information','max_participants','registration_deadline','estimated_cost','estimated_budget_note','safety_information','emergency_contact_name','emergency_contact_phone'];
function dateString(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||'')) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;}
function validTime(value){return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value||''));}
function parseRows(raw,max){
  let rows=raw;
  if(typeof raw==='string'){try{rows=JSON.parse(raw);}catch{return null;}}
  if(!Array.isArray(rows)||rows.length>max)return null;
  return rows;
}
function validate(input,{strict=false}={}){
 const errors=[];
 const text=(k,max=2000)=>String(input[k]??'').trim().slice(0,max+1);
 const data={}; for(const k of FIELDS)data[k]=text(k);
 const check=(k,max,required=true)=>{if(required&&!data[k])errors.push(`${k.replaceAll('_',' ')} is required`);if(data[k].length>max)errors.push(`${k.replaceAll('_',' ')} is too long`);};
 check('title',160);check('purpose',2000,strict);check('description',4000,strict);
 check('meeting_point',250,strict);check('transport_information',2000,strict);
 check('safety_information',4000,strict);check('emergency_contact_name',160,strict);check('emergency_contact_phone',80,strict);
 check('estimated_budget_note',1500,false);
 if(!/^\d+$/.test(data.destination_id)||Number(data.destination_id)<1) errors.push('Choose a destination');
 if(!dateString(data.start_date)||!dateString(data.end_date))errors.push('Enter valid start and end dates');
 else if(data.end_date<data.start_date)errors.push('End date cannot precede start date');
 if(data.meeting_time&&!validTime(data.meeting_time))errors.push('Use a valid meeting time');
 if(strict&&!data.meeting_time)errors.push('Meeting time is required');
 if(!/^\d+$/.test(data.max_participants)||Number(data.max_participants)<1||Number(data.max_participants)>1000)errors.push('Participant limit must be 1–1000');
 if(!/^\d+(\.\d{1,2})?$/.test(data.estimated_cost)||Number(data.estimated_cost)>10000000)errors.push('Enter a valid nonnegative estimated cost');
 if(data.registration_deadline){const deadline=new Date(data.registration_deadline);if(Number.isNaN(deadline.getTime())) errors.push('Invalid registration deadline');else if(dateString(data.start_date)&&deadline>=new Date(`${data.start_date}T23:59:59+06:00`))errors.push('Registration deadline must be before trip start');}
 else if(strict)errors.push('Registration deadline is required');
 const days=parseRows(input.itinerary,30);
 if(!days)errors.push('Itinerary is invalid or has too many entries');
 else {
  days.forEach((row,i)=>{if(!row||typeof row!=='object'||!Number.isInteger(Number(row.day_number))||Number(row.day_number)<1||Number(row.day_number)>60||String(row.title||'').trim().length>250||String(row.description||'').length>3000||(row.start_time&&!validTime(row.start_time)))errors.push(`Invalid itinerary entry ${i+1}`);});
  if(strict&&days.length===0)errors.push('Add at least one itinerary activity');
  if(strict&&dateString(data.start_date)&&dateString(data.end_date)){
   const count=Math.round((Date.parse(data.end_date)-Date.parse(data.start_date))/86400000)+1;
   if(days.some(d=>Number(d.day_number)>count))errors.push('An itinerary day exceeds the trip duration');
   for(let i=1;i<=count;i++)if(!days.some(d=>Number(d.day_number)===i && String(d.title||'').trim()))errors.push(`Add an itinerary activity for day ${i}`);
  }
 }
 const costs=parseRows(input.costs,40);
 if(!costs)errors.push('Estimated cost breakdown is invalid');
 else costs.forEach((row,i)=>{if(!row||!String(row.label||'').trim()||String(row.label||'').length>150||!/^\d+(\.\d{1,2})?$/.test(String(row.amount??''))||Number(row.amount)>10000000)errors.push(`Invalid cost item ${i+1}`);});
 if(strict&&costs&&costs.length===0)errors.push('Add an estimated cost breakdown');
 if(strict&&costs&&costs.length){const sum=costs.reduce((s,r)=>s+Math.round(Number(r.amount)*100),0);if(sum!==Math.round(Number(data.estimated_cost)*100)&&!data.estimated_budget_note)errors.push('Explain why the cost breakdown differs from the estimated total');}
 return {errors,data,itinerary:days||[],costs:costs||[]};
}
async function destinations(){return getDb().any('SELECT id,name,dzongkhag FROM destinations WHERE is_active=TRUE ORDER BY name');}
async function owned(userId){return getDb().any(`SELECT t.id,t.title,t.approval_status,t.start_date,d.name AS destination FROM trips t JOIN destinations d ON d.id=t.destination_id WHERE t.proposed_by_user_id=$1 ORDER BY t.created_at DESC,t.id DESC`,[userId]);}
async function getEditable(tripId,userId){return getDb().oneOrNone(`SELECT * FROM trips WHERE id=$1 AND proposed_by_user_id=$2 AND approval_status IN ('draft','changes_requested') AND is_active=TRUE`,[tripId,userId]);}
async function getAll(tripId,userId){
 const trip=await getDb().oneOrNone('SELECT * FROM trips WHERE id=$1 AND proposed_by_user_id=$2',[tripId,userId]);
 if(!trip)return null;
 const [itinerary,costs]=await Promise.all([
   getDb().any('SELECT day_number,start_time,title,description FROM itineraries WHERE trip_id=$1 ORDER BY day_number,sort_order,id',[tripId]),
   getDb().any('SELECT label,amount FROM trip_cost_items WHERE trip_id=$1 ORDER BY sort_order,id',[tripId])
 ]);
 return {trip,itinerary:itinerary.map(r=>({...r,start_time:r.start_time?.slice(0,5)||''})),costs};
}
async function save(userId,tripId,validated,{materialRevision=false}={}){
 const {data,itinerary,costs}=validated;
 return getDb().tx(async t=>{
  if(!await t.oneOrNone('SELECT id FROM destinations WHERE id=$1 AND is_active=TRUE',[Number(data.destination_id)]))throw Object.assign(new Error('Choose an active destination'),{status:400});
  let id;
  const vals=[data.destination_id,data.title,data.purpose||null,data.description||null,data.meeting_point||null,data.meeting_time||null,data.start_date,data.end_date,data.registration_deadline||`${data.start_date}T00:00:00+06:00`,Number(data.max_participants),Number(data.estimated_cost),data.estimated_budget_note||null,data.transport_information||null,data.safety_information||null,data.emergency_contact_name||null,data.emergency_contact_phone||null];
  if(tripId){
   // The row lock prevents editing a proposal while DSA or another request changes its state.
   const existing=await t.oneOrNone(`SELECT id,approval_status FROM trips WHERE id=$1 AND is_active=TRUE FOR UPDATE`,[tripId]);
   if(existing){if(materialRevision){if(existing.approval_status!=='approved'||!await t.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'`,[tripId,userId]))throw Object.assign(new Error('Active assignment and approved trip required for revision'),{status:403});}else if(!await t.oneOrNone(`SELECT id FROM trips WHERE id=$1 AND proposed_by_user_id=$2 AND approval_status IN ('draft','changes_requested')`,[tripId,userId]))throw Object.assign(new Error('Only your draft may be edited'),{status:403});}
   if(!existing)throw Object.assign(new Error('This proposal cannot be edited'),{status:403});
   await t.none(`UPDATE trips SET destination_id=$1,title=$2,purpose=$3,description=$4,meeting_point=$5,meeting_time=$6,start_date=$7,end_date=$8,registration_deadline=$9,max_participants=$10,estimated_cost=$11,estimated_budget_note=$12,transport_information=$13,safety_information=$14,emergency_contact_name=$15,emergency_contact_phone=$16,updated_at=NOW() WHERE id=$17`,[...vals,tripId]);id=tripId;
  }else{
   const created=await t.one(`INSERT INTO trips (proposed_by_user_id,destination_id,title,purpose,description,meeting_point,meeting_time,start_date,end_date,registration_deadline,max_participants,estimated_cost,estimated_budget_note,transport_information,safety_information,emergency_contact_name,emergency_contact_phone,approval_status,registration_open,operational_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'draft',FALSE,'planned') RETURNING id`,[userId,...vals]);id=created.id;
  }
  await t.none('DELETE FROM itineraries WHERE trip_id=$1',[id]);
  for(let i=0;i<itinerary.length;i++){
   const r=itinerary[i];await t.none('INSERT INTO itineraries(trip_id,day_number,start_time,title,description,sort_order) VALUES($1,$2,$3,$4,$5,$6)',[id,Number(r.day_number),r.start_time||null,String(r.title||'').trim(),String(r.description||'').trim(),i]);
  }
  await t.none('DELETE FROM trip_cost_items WHERE trip_id=$1',[id]);
  for(let i=0;i<costs.length;i++){const c=costs[i];await t.none('INSERT INTO trip_cost_items(trip_id,label,amount,sort_order) VALUES($1,$2,$3,$4)',[id,String(c.label).trim(),Number(c.amount),i]);}
  if(materialRevision){
   const num=await t.one('SELECT COALESCE(MAX(submission_number),0)+1 AS n FROM trip_submissions WHERE trip_id=$1',[id]);
   const trip=await t.one('SELECT * FROM trips WHERE id=$1',[id]);
   const files=await t.any('SELECT id FROM trip_attachments WHERE trip_id=$1 AND is_active=true ORDER BY id',[id]);
   const snapshot={trip,itinerary,costs,attachment_ids:files.map(f=>f.id)};
   const sub=await t.one('INSERT INTO trip_submissions(trip_id,submitted_by,submission_number,proposal_snapshot) VALUES($1,$2,$3,$4) RETURNING id',[id,userId,num.n,JSON.stringify(snapshot)]);
   for(const file of files)await t.none('INSERT INTO trip_submission_attachments(submission_id,attachment_id) VALUES($1,$2)',[sub.id,file.id]);
   await t.none(`UPDATE trips SET approval_status='pending_dsa',registration_open=false,updated_at=NOW() WHERE id=$1`,[id]);
   await t.none(`INSERT INTO trip_approval_history(trip_id,submission_id,submitted_by,action,remarks) VALUES($1,$2,$3,'approval_reset','Material proposal revision requires renewed DSA review')`,[id,sub.id,userId]);
  }
  return id;
 });
}
module.exports={validate,destinations,owned,getEditable,getAll,save};
