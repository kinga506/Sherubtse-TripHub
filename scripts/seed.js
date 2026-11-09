/** Explicit non-production demo seeder. NEVER call from server start. */
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { getDb } = require('../config/db');
const seed = require('../db/seed-data.json');

function ensureDemoMode() {
  if (process.env.NODE_ENV === 'production') throw new Error('Seeding is forbidden in production');
  if (process.env.DEMO_MODE !== 'true') throw new Error('Set DEMO_MODE=true explicitly to enable demo seed');
  for (const name of ['SEED_ADMIN_EMAIL','SEED_ADMIN_PASSWORD','SEED_DSA_EMAIL','SEED_DSA_PASSWORD','DEMO_PASSWORD']) {
    if (!process.env[name] || process.env[name].startsWith('REPLACE_')) throw new Error(`Missing ${name}; do not use default passwords`);
  }
  for (const name of ['SEED_ADMIN_PASSWORD','SEED_DSA_PASSWORD','DEMO_PASSWORD']) {
    if (process.env[name].length < 12) throw new Error(`${name} needs at least 12 characters`);
  }
  if (process.env.SEED_ADMIN_EMAIL.toLowerCase() === process.env.SEED_DSA_EMAIL.toLowerCase()) throw new Error('Admin and DSA emails must differ');
}
function dateOffset(days) {
  const date = new Date(); date.setUTCHours(12,0,0,0); date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
async function idBy(t, table, column, value) {
  return (await t.one(`SELECT id FROM ${table} WHERE ${column}=$1`, [value])).id;
}
async function seedUsers(t, programmeIds) {
  const entries = [
    {name:'Sherubtse TripHub Superadmin (demo)',email:process.env.SEED_ADMIN_EMAIL,role:'admin',pass:process.env.SEED_ADMIN_PASSWORD},
    {name:'Sherubtse DSA (demo)',email:process.env.SEED_DSA_EMAIL,role:'dsa',pass:process.env.SEED_DSA_PASSWORD},
    ...seed.demo_students.map(person=>({...person,role:'student',pass:process.env.DEMO_PASSWORD}))
  ];
  const idMap={};
  for (const person of entries) {
    const existing=await t.oneOrNone('SELECT id,role FROM users WHERE email=$1',[person.email]);
    if (existing) {
      if (existing.role!==person.role) throw new Error(`Existing account role conflict: ${person.email}`);
      idMap[person.email]=existing.id;
      continue; // never overwrite a user's password, verification or profile
    }
    const hash=await bcrypt.hash(person.pass,12);
    const programme=person.programme ? (programmeIds[person.programme] || null) : null;
    const row=await t.one(`INSERT INTO users(name,email,password_hash,role,student_id,programme_id,is_verified,is_demo)
      VALUES($1,$2,$3,$4,$5,$6,true,true) RETURNING id`,
      [person.name,person.email,hash,person.role,person.student_id||null,programme]);
    idMap[person.email]=row.id;
  }
  return idMap;
}
async function insertTrip(t, opts, destIds, proposerId, dsaId) {
  const found=await t.oneOrNone('SELECT id FROM trips WHERE seed_key=$1',[opts.seed_key]);
  if (found) return {id:found.id,created:false};
  const deadline=opts.registration_deadline || `${dateOffset(-1)}T17:00:00+06:00`;
  const row=await t.one(`INSERT INTO trips(seed_key,proposed_by_user_id,destination_id,title,purpose,description,meeting_point,meeting_time,start_date,end_date,registration_deadline,registration_open,max_participants,estimated_cost,estimated_budget_note,transport_information,approval_status,operational_status,dsa_reviewed_by,dsa_reviewed_at,dsa_remarks,is_sample,completed_at)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12,$13,$14,$15,$16,$17,$18,CASE WHEN $18::bigint IS NULL THEN NULL ELSE NOW() END,$19,true,$20) RETURNING id`,[
    opts.seed_key,proposerId,destIds[opts.destination_slug],opts.title,opts.purpose||'Demonstration of proposed college trip',opts.description,
    opts.meeting_point||'Main entrance, Sherubtse College',opts.meeting_time||'06:30',opts.start_date,opts.end_date,deadline,
    opts.max_participants,opts.estimated_cost,opts.estimated_budget_note||'Illustrative demonstration budget; not a real quotation.',
    opts.transport_information||'Shared transport; subject to local verification.',opts.approval_status||'pending_dsa',opts.operational_status||'planned',
    opts.approval_status==='approved'?dsaId:null,
    opts.approval_status==='approved'?'SIMULATED approval for demonstration only. Not an institutional decision.':null,
    opts.operational_status==='completed'?`${opts.end_date}T18:00:00+06:00`:null
  ]);
  await t.none(`INSERT INTO trip_submissions(trip_id,submitted_by,submission_number,proposal_snapshot) VALUES($1,$2,1,$3)`,
    [row.id,proposerId,JSON.stringify({source_demo:true,title:opts.title,description:opts.description})]);
  const subId=await t.one('SELECT id FROM trip_submissions WHERE trip_id=$1 AND submission_number=1',[row.id]);
  await t.none(`INSERT INTO trip_approval_history(trip_id,submission_id,submitted_by,reviewed_by,action,remarks)
    VALUES($1,$2,$3,$4,$5,$6)`,[row.id,subId.id,proposerId,opts.approval_status==='approved'?dsaId:null,opts.approval_status==='approved'?'approved':'submitted',
    'Demo fixture only. No real DSA approval has taken place.']);
  return {id:row.id,created:true};
}
async function seedAssignment(t, tripId, userId, dsaId, role, ended=false) {
 const active=await t.oneOrNone('SELECT id FROM trip_coordinators WHERE trip_id=$1 AND user_id=$2',[tripId,userId]);
 if(active) return;
 await t.none(`INSERT INTO trip_coordinators(trip_id,user_id,assignment_role,status,assigned_by,assigned_at,ended_at,end_reason)
 VALUES($1,$2,$3,$4,$5, NOW()-INTERVAL '10 days',CASE WHEN $6 THEN NOW()-INTERVAL '2 days' ELSE NULL END,$7)`,
 [tripId,userId,role,ended?'ended':'active',dsaId,ended,ended?'Demo completed trip: assignment ended on archival':null]);
}
async function main() {
 ensureDemoMode();
 const db=getDb();
 const lockKey=773062;
 await db.tx(async t=>{
  await t.one('SELECT pg_advisory_xact_lock($1) AS acquired',[lockKey]);
  const progIds={};
  for (const p of seed.programmes) {
   await t.none(`INSERT INTO programmes(code,name) VALUES($1,$2) ON CONFLICT(code) DO NOTHING`,[p.code,p.name]);
   const id=await idBy(t,'programmes','code',p.code);
   progIds[p.name]=id;progIds[p.code]=id;
  }
  const userIds=await seedUsers(t,progIds);
  const adminId=userIds[process.env.SEED_ADMIN_EMAIL], dsaId=userIds[process.env.SEED_DSA_EMAIL];
  const originalCoordinators=seed.demo_students.filter(s=>s.demo_original_coordinator);
  const leadId=userIds[originalCoordinators[0].email], assistantId=userIds[originalCoordinators[1].email];
  const destIds={};
  for (const d of seed.destinations) {
   await t.none(`INSERT INTO destinations(name,slug,dzongkhag,description,best_season,transport,transport_cost_min,transport_cost_max,entry_fee_note,distance_text,drive_time_text,trek_time_text,travel_note,practical_tip,is_trek,guide_content)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)
    ON CONFLICT(slug) DO UPDATE SET guide_content=COALESCE(destinations.guide_content,EXCLUDED.guide_content)`,
    [d.name,d.slug,d.dzongkhag,d.description,d.best_season,d.transport,d.transport_cost_min,d.transport_cost_max,d.entry_fee_note,d.distance_text,d.drive_time_text,d.trek_time_text,d.travel_note,d.practical_tip,d.is_trek,JSON.stringify(d.guide_content)]);
   const id=await idBy(t,'destinations','slug',d.slug);destIds[d.slug]=id;
   const filename=path.basename(d.photo);const fullPath=path.join(__dirname,'../public/images/destinations',filename);
   if (!fs.existsSync(fullPath)) throw new Error(`Missing extracted photo: ${fullPath}. Run npm run extract:photos`);
   await t.none(`INSERT INTO destination_photos(destination_id,file_path,alt_text,photo_credit)
    VALUES($1,$2,$3,$4) ON CONFLICT(file_path) DO NOTHING`,[id,d.photo,`Supplied photograph: ${d.name}`,null]);
  }
  for (const [table,records,columns] of [
    ['faqs',seed.faqs,['seed_key','question','answer','sort_order']],
    ['trip_rules',seed.trip_rules,['seed_key','title','body','sort_order']],
    ['testimonials',seed.testimonials,['seed_key','title','quote','attribution','sort_order','is_sample']]
  ]) {
   for (const entry of records) {
    const vals=columns.map(k=>k==='answer'?entry[k].replaceAll('TripPack','Sherubtse TripHub'):entry[k]);
    await t.none(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT(seed_key) DO NOTHING`,vals);
   }
  }
  // Keep the five source samples private/pending, never represent fabricated institutional approval.
  for (const original of seed.source_trips) {
   const dt=new Date(original.start_date+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()-14);
   const originalTrip=await insertTrip(t,{...original,registration_deadline:dt.toISOString(),approval_status:'pending_dsa'},destIds,leadId,dsaId);
   if(originalTrip.created){
    for(let n=0;n<original.itinerary.length;n++){
     const item=original.itinerary[n];
     await t.none(`INSERT INTO itineraries(trip_id,day_number,start_time,title,description,sort_order)
       VALUES($1,$2,$3,$4,$5,$6)`,[originalTrip.id,item.day_number,item.start_time,item.title,item.description,n]);
    }
    for(const item of original.packing_suggestions){
     await t.none('INSERT INTO packing_suggestions(trip_id,name) VALUES($1,$2)',[originalTrip.id,item]);
    }
    if(original.announcement)await t.none(`INSERT INTO announcements(trip_id,author_id,title,body)
      VALUES($1,$2,$3,$4)`,[originalTrip.id,leadId,'Sample trip announcement',original.announcement]);
   }
  }
  const demos=[
   {seed_key:'demo-future-chorten',title:'DEMO ONLY — Chorten Kora Student Cultural Visit',destination_slug:'chorten-kora',start_date:dateOffset(35),end_date:dateOffset(36),registration_deadline:`${dateOffset(21)}T17:00:00+06:00`,max_participants:12,estimated_cost:1800,approval_status:'approved',description:'Fictional sample trip for testing. Dates and amount are illustrative, not confirmed. DSA approval is simulated.'},
   {seed_key:'demo-future-merak',title:'DEMO ONLY — Merak Cultural Exploration',destination_slug:'merak-village',start_date:dateOffset(55),end_date:dateOffset(57),registration_deadline:`${dateOffset(41)}T17:00:00+06:00`,max_participants:10,estimated_cost:3500,approval_status:'approved',description:'Fictional sample trip for testing. Dates and amount are illustrative, not confirmed. DSA approval is simulated.'}
  ];
  for (let i=0;i<demos.length;i++) {
    const r=await insertTrip(t,demos[i],destIds,leadId,dsaId);
    if(r.created) {
      await seedAssignment(t,r.id,i===0?leadId:assistantId,dsaId,'lead');
      await seedAssignment(t,r.id,i===0?assistantId:leadId,dsaId,'assistant');
    }
  }
  const historic={seed_key:'demo-completed-historic',title:'DEMO ONLY — Archived Cultural Visit',destination_slug:'chorten-kora',start_date:dateOffset(-35),end_date:dateOffset(-34),registration_deadline:`${dateOffset(-49)}T17:00:00+06:00`,max_participants:8,estimated_cost:1800,approval_status:'approved',operational_status:'completed',description:'Synthetic archived trip for demonstrating completed-trip views. No actual event, consent or attendance implied.'};
  const old=await insertTrip(t,historic,destIds,leadId,dsaId);
  if(old.created) {
   await seedAssignment(t,old.id,leadId,dsaId,'lead',true);
   await seedAssignment(t,old.id,assistantId,dsaId,'assistant',true);
   await t.none(`INSERT INTO trip_final_reports(trip_id,submitted_by,final_attendance_summary,total_actual_expenses,expense_summary,total_student_contributions,contribution_summary,incident_report,feedback_count_at_submission,feedback_summary_at_submission,additional_notes)
    VALUES($1,$2,$3,0,$4,0,$5,$6,0,$7,$8)`,[old.id,leadId,JSON.stringify({records:0,note:'No actual attendance data seeded'}),JSON.stringify([]),JSON.stringify([]),'No incidents reported in synthetic fixture; no actual event occurred.','No feedback received at submission.','Synthetic archived record; not an official trip report.']);
  }
  // Sample join-request fixture is REJECTED (not pending or approved) because no real consent document exists.
  const demonstrationStudent=seed.demo_students.find(u=>!u.demo_original_coordinator);
  const futureId=await idBy(t,'trips','seed_key','demo-future-chorten');
  await t.none(`INSERT INTO participants(trip_id,user_id,reason,status,reviewed_by,reviewed_at,decision_note)
   VALUES($1,$2,$3,'rejected',$4,NOW(),$5) ON CONFLICT(trip_id,user_id) DO NOTHING`,
   [futureId,userIds[demonstrationStudent.email],'Demonstration request (no real consent letter attached)',leadId,'Demo rejected: no consent document. Never assume guardian permission.']);
 });
 console.log('Demo seed committed. All sample data is fictional. Re-run leaves existing records unchanged.');
}
main().catch(err=>{console.error('Seeding aborted:',err.message);process.exitCode=1;});
