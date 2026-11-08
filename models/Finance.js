// Actual trip expenses and manually recorded contributions. All monetary calculations use PostgreSQL NUMERIC.
const {getDb}=require('../config/db');
const {validId}=require('./Access');
const CATEGORIES=['transport','accommodation','food','activities','other'];
function fail(message,status=422){const error=new Error(message);error.status=status;throw error;}
function amount(value){
 const s=String(value??'').trim();
 if(!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(s))fail('Enter a non-negative amount with at most two decimal places');
 return s;
}
function date(value){
 const s=String(value??'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))fail('Enter a valid date');
 const parsed=new Date(s+'T00:00:00Z');
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==s)fail('Enter a valid date');
 return s;
}
function text(value,max=250){const s=String(value??'').trim();if(s.length>max)fail('Text is too long');return s;}
function expenseInput(body){
 const category=String(body.category??'');
 if(!CATEGORIES.includes(category))fail('Choose a valid expense category');
 return {category,description:text(body.description,500),amount:amount(body.amount),spentOn:date(body.spent_on)};
}
function contributionInput(body){
 if(!validId(body.user_id))fail('Select an approved participant');
 return {userId:Number(body.user_id),amount:amount(body.amount),paidOn:date(body.paid_on),note:text(body.note,500)};
}
function money(value){return 'Nu. '+Number(value||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function balance(estimated,contributed){
 const toCents=v=>Math.round(Number(v||0)*100);
 const difference=toCents(estimated)-toCents(contributed);
 return {due:Math.max(0,difference)/100,excess:Math.max(0,-difference)/100};
}
function writable(trip){return Boolean(trip.is_active&&trip.approval_status==='approved'&&!['completed','cancelled'].includes(trip.operational_status));}
async function access(db,tripId,userId){
 const trip=await db.oneOrNone(`SELECT id,title,estimated_cost,approval_status,operational_status,is_active FROM trips WHERE id=$1`,[tripId]);
 if(!trip)fail('Trip not found',404);
 const assignment=await db.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'`,[tripId,userId]);
 const participant=await db.oneOrNone(`SELECT id FROM participants WHERE trip_id=$1 AND user_id=$2 AND status='approved'`,[tripId,userId]);
 if(!assignment&&!participant)fail('Access denied',403);
 return {trip,canManage:Boolean(assignment&&writable(trip)),isCoordinator:Boolean(assignment),isParticipant:Boolean(participant)};
}
async function overview(tripId,userId){
 if(!validId(tripId))fail('Invalid trip',400);
 const db=getDb();const context=await access(db,Number(tripId),userId);
 const {trip,isCoordinator,isParticipant}=context;
 // No aggregate across other students is retrieved for participant-only requests.
 if(!isCoordinator){
  const contributions=await db.any(`SELECT id,amount,paid_on,note FROM contributions WHERE trip_id=$1 AND user_id=$2 ORDER BY paid_on DESC,id DESC`,[tripId,userId]);
  const totals=await db.one(`SELECT COALESCE(SUM(amount),0) AS contributed FROM contributions WHERE trip_id=$1 AND user_id=$2`,[tripId,userId]);
  return {...context,contributions,ownTotal:totals.contributed,ownBalance:balance(trip.estimated_cost,totals.contributed),money,CATEGORIES};
 }
 const [expenses,contributions,participants,totals]=await Promise.all([
  db.any(`SELECT e.id,e.category,e.description,e.amount,e.spent_on,e.recorded_by FROM expenses e WHERE e.trip_id=$1 ORDER BY e.spent_on DESC,e.id DESC`,[tripId]),
  db.any(`SELECT c.id,c.user_id,u.name AS student_name,c.amount,c.paid_on,c.note,c.recorded_by FROM contributions c JOIN users u ON u.id=c.user_id WHERE c.trip_id=$1 ORDER BY c.paid_on DESC,c.id DESC`,[tripId]),
  db.any(`SELECT p.user_id,u.name,COALESCE(SUM(c.amount),0) AS contributed FROM participants p JOIN users u ON u.id=p.user_id LEFT JOIN contributions c ON c.user_id=p.user_id AND c.trip_id=p.trip_id WHERE p.trip_id=$1 AND p.status='approved' GROUP BY p.user_id,u.name ORDER BY u.name,p.user_id`,[tripId]),
  db.one(`SELECT (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE trip_id=$1) AS total_expenses,(SELECT COALESCE(SUM(amount),0) FROM contributions WHERE trip_id=$1) AS total_contributions`,[tripId])
 ]);
 return {...context,expenses,contributions,participants:participants.map(p=>({...p,...balance(trip.estimated_cost,p.contributed)})),totals,money,CATEGORIES};
}
async function mutate(tripId,userId,operation){
 if(!validId(tripId))fail('Invalid trip',400);
 return getDb().tx(async t=>{
  const trip=await t.oneOrNone(`SELECT id,is_active,approval_status,operational_status FROM trips WHERE id=$1 FOR UPDATE`,[tripId]);
  if(!trip)fail('Trip not found',404);
  if(!writable(trip))fail('Trip financial records are read-only',409);
  const assigned=await t.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'`,[tripId,userId]);
  if(!assigned)fail('Active trip Coordinator assignment required',403);
  return operation(t);
 });
}
async function saveExpense(tripId,userId,body,id){
 const v=expenseInput(body);if(id!==undefined&&!validId(id))fail('Invalid expense ID',400);
 return mutate(tripId,userId,async t=>{
  if(id===undefined)return t.one(`INSERT INTO expenses(trip_id,category,description,amount,spent_on,recorded_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[tripId,v.category,v.description,v.amount,v.spentOn,userId]);
  const updated=await t.oneOrNone(`UPDATE expenses SET category=$3,description=$4,amount=$5,spent_on=$6,recorded_by=$7 WHERE trip_id=$1 AND id=$2 RETURNING *`,[tripId,id,v.category,v.description,v.amount,v.spentOn,userId]);
  if(!updated)fail('Expense not found for this trip',404);return updated;
 });
}
async function saveContribution(tripId,userId,body,id){
 const v=contributionInput(body);if(id!==undefined&&!validId(id))fail('Invalid contribution ID',400);
 return mutate(tripId,userId,async t=>{
  const approved=await t.oneOrNone(`SELECT id FROM participants WHERE trip_id=$1 AND user_id=$2 AND status='approved'`,[tripId,v.userId]);
  if(!approved)fail('Contributions can only be recorded for approved participants',422);
  if(id===undefined)return t.one(`INSERT INTO contributions(trip_id,user_id,amount,paid_on,note,recorded_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[tripId,v.userId,v.amount,v.paidOn,v.note,userId]);
  const old=await t.oneOrNone('SELECT user_id FROM contributions WHERE trip_id=$1 AND id=$2',[tripId,id]);
  if(!old)fail('Contribution not found for this trip',404);
  // Prevent an existing contribution from being reassigned to a different student.
  if(Number(old.user_id)!==v.userId)fail('Cannot change the student on an existing contribution',422);
  return t.one(`UPDATE contributions SET amount=$3,paid_on=$4,note=$5,recorded_by=$6 WHERE trip_id=$1 AND id=$2 RETURNING *`,[tripId,id,v.amount,v.paidOn,v.note,userId]);
 });
}
module.exports={overview,saveExpense,saveContribution,expenseInput,contributionInput,amount,date,balance,money,CATEGORIES,writable};
