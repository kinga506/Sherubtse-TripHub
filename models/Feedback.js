// Trip feedback lives in MongoDB; all eligibility checks remain in PostgreSQL.
const {getMongo}=require('../config/mongo');
const {getDb}=require('../config/db');
const {validId}=require('./Access');
function fail(message,status=422){const error=new Error(message);error.status=status;throw error;}
function validate(rating,comment){
 const n=Number(rating);
 if(!Number.isInteger(n)||n<1||n>5)fail('Rating must be a whole number between 1 and 5');
 if(typeof comment!=='string'||!comment.trim()||comment.trim().length>1500)fail('Feedback must be between 1 and 1500 characters');
 return {rating:n,comment:comment.trim()};
}
// Eligible students are approved participants; trip end date must have passed.
// Do not trust participant, trip or student IDs provided by a browser form.
async function participation(tripId,userId){
 if(!validId(tripId)||!validId(userId))fail('Invalid trip or Student ID',400);
 const trip=await getDb().oneOrNone(`SELECT t.id,t.title,t.end_date,t.operational_status,t.is_active,
  p.id AS participation_id,u.name AS student_name
  FROM trips t JOIN participants p ON p.trip_id=t.id AND p.user_id=$2 AND p.status='approved'
  JOIN users u ON u.id=$2 AND u.role='student' AND u.is_active=TRUE AND u.is_verified=TRUE
  WHERE t.id=$1 AND t.approval_status='approved'`,[tripId,userId]);
 if(!trip)fail('Only approved participants may submit feedback',403);
 if(!trip.is_active||trip.operational_status==='cancelled')fail('Feedback is unavailable for this trip',409);
 const end=typeof trip.end_date==='string'?trip.end_date.slice(0,10):new Date(trip.end_date).toISOString().slice(0,10);
 if(end>=new Date().toISOString().slice(0,10))fail('Feedback opens after the trip end date',409);
 if(!['awaiting_final_report','completed'].includes(trip.operational_status))fail('Feedback opens after the trip has ended',409);
 return trip;
}
async function tripAccess(tripId,userId){
 if(!validId(tripId)||!validId(userId))fail('Invalid trip or Student ID',400);
 const db=getDb();
 const trip=await db.oneOrNone('SELECT id,title FROM trips WHERE id=$1',[tripId]);
 if(!trip)fail('Trip not found',404);
 const assignment=await db.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 LIMIT 1`,[tripId,userId]);
 if(!assignment)fail('Only assigned or former Trip Coordinators may view this feedback',403);
 return trip;
}
async function createFeedback({tripId,studentId,rating,comment}){
 const data=validate(rating,comment);
 const trip=await participation(tripId,studentId);
 const entry={tripId:Number(tripId),studentId:Number(studentId),studentName:trip.student_name,
  rating:data.rating,comment:data.comment,createdAt:new Date()};
 try{await getMongo().collection('feedback').insertOne(entry);return entry;}
 catch(error){if(error.code===11000)fail('You have already submitted feedback for this trip',409);throw error;}
}
async function getFeedbackForTrip(tripId){
 if(!validId(tripId))fail('Invalid trip ID',400);
 return getMongo().collection('feedback').find({tripId:Number(tripId)},{projection:{_id:0}}).sort({createdAt:-1}).toArray();
}
async function getFeedbackForTrips(tripIds){
 if(!Array.isArray(tripIds)||!tripIds.length)return [];
 if(!tripIds.every(validId))fail('Invalid trip IDs',400);
 return getMongo().collection('feedback').find({tripId:{$in:[...new Set(tripIds.map(Number))]}},{projection:{_id:0}}).sort({createdAt:-1}).toArray();
}
async function getFeedbackByStudent(studentId){
 if(!validId(studentId))fail('Invalid Student ID',400);
 return getMongo().collection('feedback').find({studentId:Number(studentId)},{projection:{_id:0}}).sort({createdAt:-1}).toArray();
}
// The controller must call this scoped function, not pass arbitrary IDs to a broad collection query.
async function studentPage(tripId,userId){
 const trip=await participation(tripId,userId);
 const rows=await getFeedbackByStudent(userId);
 return {trip,existing:rows.find(r=>r.tripId===Number(tripId))||null};
}
async function coordinatorPage(tripId,userId){
 const trip=await tripAccess(tripId,userId);
 const entries=await getFeedbackForTrip(tripId);
 const count=entries.length;
 const average=count?entries.reduce((sum,r)=>sum+r.rating,0)/count:null;
 return {trip,entries,count,average};
}
module.exports={validate,participation,tripAccess,createFeedback,getFeedbackForTrip,getFeedbackForTrips,getFeedbackByStudent,studentPage,coordinatorPage};
