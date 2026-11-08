// Step 14: user-scoped packing operations, with repeat permission checks for every mutation.
const {getDb}=require('../config/db');
const {validId}=require('./Access');
function error(message,status=422){const e=new Error(message);e.status=status;throw e;}
function sanitize(input){
 const name=String(input.name??'').trim();
 const quantity=String(input.quantity??'').trim();
 if(!name||name.length>120)error('Item name must be 1–120 characters');
 if(quantity.length>60)error('Quantity must be at most 60 characters');
 return {name,quantity:quantity||null};
}
function parsePacked(value){if(value===true)return true;if(value===false)return false;error('Packed must be true or false');}
function editable(trip){return trip.is_active&&trip.approval_status==='approved'&&!['completed','cancelled','awaiting_final_report'].includes(trip.operational_status);}
async function context(tripId,userId){
 const db=getDb();
 const trip=await db.oneOrNone(`SELECT id,title,destination_id,approval_status,operational_status,is_active FROM trips WHERE id=$1`,[tripId]);
 if(!trip)error('Trip not found',404);
 const participant=await db.oneOrNone(`SELECT id FROM participants WHERE trip_id=$1 AND user_id=$2 AND status='approved'`,[tripId,userId]);
 const assignment=await db.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'`,[tripId,userId]);
 const historical=await db.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2`,[tripId,userId]);
 if(!participant&&!assignment&&!historical)error('Access denied',403);
 const canManage=Boolean(assignment&&editable(trip));
 const canPersonal=Boolean(participant&&editable(trip));
 const [destinationSuggestions,tripSuggestions,items]=await Promise.all([
  db.any(`SELECT id,name,quantity FROM destination_packing_suggestions WHERE destination_id=$1 ORDER BY name,id`,[trip.destination_id]),
  db.any(`SELECT id,name,quantity FROM packing_suggestions WHERE trip_id=$1 ORDER BY id`,[tripId]),
  participant?db.any(`SELECT id,name,quantity,is_packed FROM packing_items WHERE trip_id=$1 AND user_id=$2 ORDER BY id`,[tripId,userId]):Promise.resolve([])
 ]);
 return {trip,canManage,canPersonal,hasPersonalAccess:Boolean(participant),destinationSuggestions,tripSuggestions,items};
}
async function mutatePersonal(tripId,userId,fn){return getDb().tx(async t=>{
 const trip=await t.oneOrNone(`SELECT id,approval_status,operational_status,is_active FROM trips WHERE id=$1 FOR UPDATE`,[tripId]);
 if(!trip)error('Trip not found',404);
 if(!editable(trip))error('This trip checklist is read-only',409);
 if(!await t.oneOrNone(`SELECT id FROM participants WHERE trip_id=$1 AND user_id=$2 AND status='approved'`,[tripId,userId]))error('Approved participant access required',403);
 return fn(t);
});}
async function addItem(tripId,userId,input){const value=sanitize(input);return mutatePersonal(tripId,userId,t=>t.one(`
 INSERT INTO packing_items(trip_id,user_id,name,quantity) VALUES($1,$2,$3,$4)
 ON CONFLICT(trip_id,user_id,name) DO UPDATE SET quantity=EXCLUDED.quantity
 RETURNING id,name,quantity,is_packed`,[tripId,userId,value.name,value.quantity]));}
async function copySuggestions(tripId,userId){return mutatePersonal(tripId,userId,async t=>{
 // Both destination and trip suggestions are server-fetched; never accept a client-supplied user ID or list.
 const trip=await t.one('SELECT destination_id FROM trips WHERE id=$1',[tripId]);
 const result=await t.result(`INSERT INTO packing_items(trip_id,user_id,name,quantity)
 SELECT $1,$2,s.name,s.quantity FROM (
   SELECT name,quantity FROM packing_suggestions WHERE trip_id=$1
   UNION ALL
   SELECT name,quantity FROM destination_packing_suggestions WHERE destination_id=$3
 ) s
 ON CONFLICT(trip_id,user_id,name) DO NOTHING`,[tripId,userId,trip.destination_id]);
 return {added:result.rowCount};
});}
async function toggle(tripId,userId,itemId,value){if(!validId(itemId))error('Invalid packing item',400);const packed=parsePacked(value);
 return mutatePersonal(tripId,userId,async t=>{
 const row=await t.oneOrNone(`UPDATE packing_items SET is_packed=$4 WHERE id=$3 AND trip_id=$1 AND user_id=$2 RETURNING id,is_packed`,[tripId,userId,itemId,packed]);
 if(!row)error('Packing item not found',404);
 return row;
 });}
async function removeItem(tripId,userId,itemId){if(!validId(itemId))error('Invalid packing item',400);return mutatePersonal(tripId,userId,async t=>{
 const result=await t.result(`DELETE FROM packing_items WHERE trip_id=$1 AND user_id=$2 AND id=$3`,[tripId,userId,itemId]);
 if(!result.rowCount)error('Packing item not found',404);
 return {removed:true};
});}
async function manageSuggestion(tripId,userId,input,deleteId){if(deleteId!==undefined&&!validId(deleteId))error('Invalid suggestion',400);const value=deleteId===undefined?sanitize(input):null;
 return getDb().tx(async t=>{
 const trip=await t.oneOrNone(`SELECT id,approval_status,operational_status,is_active FROM trips WHERE id=$1 FOR UPDATE`,[tripId]);
 if(!trip)error('Trip not found',404);
 if(!editable(trip))error('Trip suggestions are read-only',409);
 if(!await t.oneOrNone(`SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2 AND status='active'`,[tripId,userId]))error('Active Coordinator assignment required',403);
 if(deleteId!==undefined){const result=await t.result(`DELETE FROM packing_suggestions WHERE trip_id=$1 AND id=$2`,[tripId,deleteId]);if(!result.rowCount)error('Suggestion not found',404);return {removed:true};}
 return t.one(`INSERT INTO packing_suggestions(trip_id,name,quantity) VALUES($1,$2,$3)
 ON CONFLICT(trip_id,name) DO UPDATE SET quantity=EXCLUDED.quantity RETURNING id,name,quantity`,[tripId,value.name,value.quantity]);
 });}
module.exports={context,addItem,copySuggestions,toggle,removeItem,manageSuggestion,sanitize,parsePacked,editable,error};
