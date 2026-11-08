'use strict';
const crypto=require('node:crypto');
const {getDb}=require('../config/db');
const {getStorage}=require('../config/storage');
const pdf=require('../services/pdf/studentTravelForm');
function fault(message,status=400){const e=new Error(message);e.status=status;return e;}
const participantsSql=`SELECT u.id,u.name,u.academic_year,u.residence_hall,pr.name AS programme FROM participants p JOIN users u ON u.id=p.user_id LEFT JOIN programmes pr ON pr.id=u.programme_id WHERE p.trip_id=$1 AND p.status='approved' ORDER BY u.name,p.id`;
async function data(tripId){
 const db=getDb();
 const [trip,lead,participants,forms]=await Promise.all([
  db.oneOrNone(`SELECT t.*,d.name AS destination_name FROM trips t JOIN destinations d ON d.id=t.destination_id WHERE t.id=$1`,[tripId]),
  db.oneOrNone(`SELECT u.name,u.phone,u.academic_year,pr.name AS programme FROM trip_coordinators tc JOIN users u ON u.id=tc.user_id LEFT JOIN programmes pr ON pr.id=u.programme_id WHERE tc.trip_id=$1 AND tc.assignment_role='lead' AND tc.status='active' ORDER BY tc.id DESC LIMIT 1`,[tripId]),
  db.any(participantsSql,[tripId]),
  db.any('SELECT id,form_version,generated_by,generated_at FROM student_travel_forms WHERE trip_id=$1 ORDER BY form_version DESC',[tripId])
 ]);
 if(!trip)throw fault('Trip not found',404);
 return {trip,lead,participants,forms};
}
function validatedFields(base,extra){
 const out={...base};
 const overrides=['contact','via','vehicleType','vehicleNumber','driverNameAndLicense','timeOfTravel'];
 for(const key of overrides)if(Object.prototype.hasOwnProperty.call(extra,key)){
  const v=extra[key];if(typeof v!=='string'||v.length>120)throw fault('Invalid field '+key);
  out[key]=v.trim();
 }
 // Missing organiser profile fields can be supplied for this PDF snapshot only.
 // Never allow changing existing verified/profile values via form POST.
 for(const key of ['organizerName','programme','year'])if(!base[key]&&Object.prototype.hasOwnProperty.call(extra,key)){
  const v=extra[key];if(typeof v!=='string'||!v.trim()||v.length>70)throw fault('Invalid missing field '+key);
  out[key]=v.trim();
 }
 return out;
}
async function create(tripId,userId,extra){
 const db=getDb();let storageRef;
 try{return await db.tx(async t=>{
  const trip=await t.oneOrNone(`SELECT t.*,d.name AS destination_name FROM trips t JOIN destinations d ON d.id=t.destination_id WHERE t.id=$1 FOR UPDATE OF t`,[tripId]);
  if(!trip)throw fault('Trip not found',404);
  if(!trip.is_active||['completed','cancelled'].includes(trip.operational_status))throw fault('This trip is read-only',409);
  const allowed=await t.oneOrNone(`SELECT tc.id FROM trip_coordinators tc JOIN users u ON u.id=tc.user_id WHERE tc.trip_id=$1 AND tc.user_id=$2 AND tc.status='active' AND u.role='student' AND u.is_active AND u.is_verified`,[tripId,userId]);
  if(!allowed)throw fault('An active trip-specific Coordinator assignment is required',403);
  const [lead,participants]=await Promise.all([
   t.oneOrNone(`SELECT u.name,u.phone,u.academic_year,pr.name AS programme FROM trip_coordinators tc JOIN users u ON u.id=tc.user_id LEFT JOIN programmes pr ON pr.id=u.programme_id WHERE tc.trip_id=$1 AND tc.assignment_role='lead' AND tc.status='active' LIMIT 1`,[tripId]),
   t.any(participantsSql,[tripId])
  ]);
  if(!lead)throw fault('An active lead Coordinator is required',409);
  if(!participants.length)throw fault('No approved students to include in the official form',409);
  if(participants.length>pdf.MAX_ROWS)throw fault('The original official form has room for only 30 approved students; consult DSA about an additional page',409);
  const fields=validatedFields(pdf.buildFields(trip,lead),extra);
  const absent=pdf.missing(fields);
  if(absent.length)throw fault('Complete missing form fields: '+absent.join(', '),422);
  const entries=participants.map(p=>{
   const item={...p,destination:fields.destination};
   for(const prop of ['programme','academic_year','residence_hall']){
    if(!item[prop]){const value=extra[`student_${p.id}_${prop}`];if(typeof value!=='string'||!value.trim()||value.length>75)throw fault(`Missing ${prop} for ${p.name}. Confirm this student's information before generating the form`,422);item[prop]=value.trim();}
   }
   return item;
  });
  const bytes=await pdf.generateFromTemplate(fields,entries);
  storageRef=await getStorage().put(bytes,'application/pdf');
  const version=await t.one('SELECT COALESCE(MAX(form_version),0)::int+1 AS n FROM student_travel_forms WHERE trip_id=$1',[tripId]);
  const result=await t.one(`INSERT INTO student_travel_forms(trip_id,generated_by,form_version,fields_snapshot,participant_snapshot,pdf_storage_key,pdf_sha256) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7) RETURNING id,form_version`,[tripId,userId,version.n,JSON.stringify(fields),JSON.stringify(entries),storageRef.key,crypto.createHash('sha256').update(bytes).digest('hex')]);
  return result;
 });}catch(e){if(storageRef)try{await getStorage().delete(storageRef.key);}catch(error){console.error('Orphan form cleanup failed',error.message);}throw e;}
}
async function getForm(formId,userId){
 const db=getDb();const record=await db.oneOrNone('SELECT * FROM student_travel_forms WHERE id=$1',[formId]);if(!record)throw fault('Travel form not found',404);
 const [user,assigned]=await Promise.all([
  db.oneOrNone('SELECT role,is_active,is_verified FROM users WHERE id=$1',[userId]),
  db.oneOrNone('SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 ORDER BY assigned_at DESC LIMIT 1',[record.trip_id,userId])
 ]);
 if(!user||!user.is_active||!user.is_verified||(!assigned&&user.role!=='dsa'))throw fault('Access denied',403);
 // A former coordinator can read historical forms, but cannot generate a new one.
 const bytes=await getStorage().get(record.pdf_storage_key);
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==record.pdf_sha256)throw fault('PDF checksum does not match',409);
 return {record,bytes};
}
module.exports={data,create,getForm,validatedFields,fault};
