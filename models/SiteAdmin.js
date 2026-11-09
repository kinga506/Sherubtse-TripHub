const {getDb}=require('../config/db');
const {validId}=require('./Access');
const CONTENT={faqs:{fields:['question','answer','sort_order','is_active']},trip_rules:{fields:['title','body','sort_order','is_active']},testimonials:{fields:['title','quote','attribution','sort_order','is_active']}};
const fail=(message,status=422)=>Object.assign(new Error(message),{status});
const trimmed=(v,max=2000)=>{const s=String(v??'').trim();if(s.length>max)throw fail('Value too long');return s;};
async function dashboard(){const db=getDb();const [users,tripStats,assignments]=await Promise.all([
 db.one(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE role='student')::int AS students, COUNT(*) FILTER(WHERE role='dsa')::int AS dsa FROM users`),
 db.any('SELECT approval_status,operational_status,COUNT(*)::int AS count FROM trips GROUP BY approval_status,operational_status ORDER BY approval_status,operational_status'),
 db.any(`SELECT t.id AS trip_id,t.title,c.assignment_role,c.status,c.assigned_at,c.ended_at,u.name AS student_name,assigner.name AS assigned_by_name FROM trip_coordinators c JOIN trips t ON t.id=c.trip_id JOIN users u ON u.id=c.user_id JOIN users assigner ON assigner.id=c.assigned_by ORDER BY c.assigned_at DESC,c.id DESC LIMIT 100`)]);return {users,tripStats,assignments};}
async function list(section){const db=getDb();if(section==='users')return db.any(`SELECT u.id,u.name,u.email,u.role,u.is_active,u.is_verified,u.student_id,p.name AS programme FROM users u LEFT JOIN programmes p ON p.id=u.programme_id ORDER BY u.created_at DESC,u.id DESC LIMIT 300`);
 if(section==='programmes')return db.any('SELECT id,code,name,is_active FROM programmes ORDER BY name,id');
 if(section==='destinations')return db.any('SELECT id,name,slug,dzongkhag,description,best_season,transport,entry_fee_note,practical_tip,is_active FROM destinations ORDER BY name,id');
 if(section==='photos')return db.any('SELECT p.id,p.destination_id,d.name AS destination,p.file_path,p.alt_text,p.photo_credit,p.sort_order FROM destination_photos p JOIN destinations d ON d.id=p.destination_id ORDER BY d.name,p.sort_order,p.id');
 if(CONTENT[section])return db.any(`SELECT * FROM ${section} ORDER BY sort_order,id`);
 throw fail('Unknown management section',404);
}
async function update(section,id,body,actorId){if(!validId(id))throw fail('Invalid ID');const db=getDb();
 if(section==='users'){
  const active=body.is_active==='true';return db.tx(async t=>{
   const row=await t.oneOrNone('SELECT id,role,is_active FROM users WHERE id=$1 FOR UPDATE',[id]);if(!row)throw fail('User not found',404);
   if(Number(id)===Number(actorId)&&!active)throw fail('You cannot deactivate your own account');
   if(row.role==='admin'&&!active){const other=await t.one(`SELECT COUNT(*)::int AS count FROM users WHERE role='admin' AND is_active=true AND id<>$1`,[id]);if(other.count===0)throw fail('Cannot deactivate the last active Superadmin');}
   await t.none('UPDATE users SET is_active=$1 WHERE id=$2',[active,id]);
  });
 }
 if(section==='photos'){
  const alt=trimmed(body.alt_text,250),credit=trimmed(body.photo_credit,250),sort=Number(body.sort_order);
  if(!alt||!Number.isSafeInteger(sort)||sort<0||sort>9999)throw fail('Invalid photo metadata');
  const result=await db.result('UPDATE destination_photos SET alt_text=$1,photo_credit=$2,sort_order=$3 WHERE id=$4',[alt,credit,sort,id]);if(!result.rowCount)throw fail('Photo not found',404);return;
 }
 let data={};if(section==='programmes'){data={code:trimmed(body.code,30),name:trimmed(body.name,150),is_active:body.is_active==='true'};if(!data.code||!data.name)throw fail('Programme code and name required');}
 else if(section==='destinations'){data={name:trimmed(body.name,150),dzongkhag:trimmed(body.dzongkhag,120),description:trimmed(body.description,7000),best_season:trimmed(body.best_season,300),transport:trimmed(body.transport,500),entry_fee_note:trimmed(body.entry_fee_note,500),practical_tip:trimmed(body.practical_tip,1000),is_active:body.is_active==='true'};if(!data.name||!data.dzongkhag||!data.description)throw fail('Name, Dzongkhag and description required');}
 else if(CONTENT[section]){const fields=CONTENT[section].fields;for(const field of fields){if(field==='is_active')data[field]=body[field]==='true';else if(field==='sort_order'){const n=Number(body[field]);if(!Number.isSafeInteger(n)||n<0||n>9999)throw fail('Invalid sort order');data[field]=n;}else data[field]=trimmed(body[field],field==='answer'||field==='body'||field==='quote'?4000:250);} const required=section==='faqs'?['question','answer']:section==='trip_rules'?['title','body']:['title','quote'];if(required.some(k=>!data[k]))throw fail('Required fields cannot be blank');}
 else throw fail('Unsupported section',404);
 const fields=Object.keys(data),args=Object.values(data);args.push(id);
 const result=await db.result(`UPDATE ${section} SET ${fields.map((k,i)=>`${k}=$${i+1}`).join(',')} WHERE id=$${args.length}`,args);
 if(!result.rowCount)throw fail('Record not found',404);
}
async function create(section,body){if(!['programmes','faqs','trip_rules','testimonials'].includes(section))throw fail('Creation not supported here');const db=getDb();
 if(section==='programmes'){const code=trimmed(body.code,30),name=trimmed(body.name,150);if(!code||!name)throw fail('Code and name required');return db.none('INSERT INTO programmes(code,name) VALUES($1,$2)',[code,name]);}
 const data=CONTENT[section].fields;const vals=data.map(f=>f==='is_active'?true:f==='sort_order'?0:trimmed(body[f],f==='answer'||f==='body'||f==='quote'?4000:250));
 if(!vals[0]||!vals[1])throw fail('Required content missing');return db.none(`INSERT INTO ${section}(${data.join(',')}) VALUES(${data.map((_,i)=>'$'+(i+1)).join(',')})`,vals);
}
async function createDestination(body){
 const name=trimmed(body.name,150),slug=trimmed(body.slug,160).toLowerCase(),dzongkhag=trimmed(body.dzongkhag,120),description=trimmed(body.description,7000);
 if(!name||!dzongkhag||!description||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw fail('Name, slug, dzongkhag and description required');
 await getDb().none('INSERT INTO destinations(name,slug,dzongkhag,description) VALUES($1,$2,$3,$4)',[name,slug,dzongkhag,description]);
}
async function addPhoto(destinationId,storageKey,alt,credit){
 if(!validId(destinationId)||!trimmed(alt,250))throw fail('Invalid destination or alt text');
 const exists=await getDb().oneOrNone('SELECT id FROM destinations WHERE id=$1',[destinationId]);if(!exists)throw fail('Destination not found',404);
 return getDb().one(`INSERT INTO destination_photos(destination_id,file_path,alt_text,photo_credit) VALUES($1,$2,$3,$4) RETURNING id`,[destinationId,storageKey,trimmed(alt,250),trimmed(credit,250)]);
}
async function photoById(id){if(!validId(id))return null;return getDb().oneOrNone(`SELECT p.file_path,d.is_active FROM destination_photos p JOIN destinations d ON d.id=p.destination_id WHERE p.id=$1`,[id]);}
async function dsaHistory(){const db=getDb();return Promise.all([
 db.any(`SELECT h.id,h.action,h.remarks,h.created_at,t.title,t.id AS trip_id,reviewer.name AS reviewer FROM trip_approval_history h JOIN trips t ON t.id=h.trip_id LEFT JOIN users reviewer ON reviewer.id=h.reviewed_by ORDER BY h.created_at DESC,h.id DESC LIMIT 150`),
 db.any(`SELECT r.id,r.trip_id,t.title,r.submission_number,r.review_status,r.reviewed_at,r.review_remarks FROM final_participant_submissions r JOIN trips t ON t.id=r.trip_id ORDER BY r.submitted_at DESC,r.id DESC LIMIT 100`),
 db.any(`SELECT t.id,t.title,t.completed_at,r.submitted_at,r.total_actual_expenses,r.total_student_contributions,r.incident_report FROM trips t JOIN trip_final_reports r ON r.trip_id=t.id WHERE t.operational_status='completed' ORDER BY t.completed_at DESC LIMIT 100`)]).then(([reviews,finalLists,completed])=>({reviews,finalLists,completed}));}
module.exports={dashboard,list,update,create,dsaHistory,createDestination,addPhoto,photoById,CONTENT,fail};
