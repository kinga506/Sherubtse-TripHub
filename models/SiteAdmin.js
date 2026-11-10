const {getDb}=require('../config/db');
const {validId}=require('./Access');
const CONTENT={faqs:{fields:['question','answer','sort_order','is_active']},trip_rules:{fields:['title','body','sort_order','is_active']},testimonials:{fields:['title','quote','attribution','sort_order','is_active']}};
const fail=(message,status=422)=>Object.assign(new Error(message),{status});
const trimmed=(v,max=2000)=>{const s=String(v??'').trim();if(s.length>max)throw fail('Value too long');return s;};
async function audit(actorId,action,targetType,targetId,context=null){return getDb().none(`INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id,context) VALUES($1,$2,$3,$4,$5)`,[actorId,action,targetType,String(targetId),context?JSON.stringify(context):null]);}
async function dashboard(){const db=getDb();const [users,tripStats,reviewCount,upcomingTrips,recentAudit]=await Promise.all([
 db.one(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE role='student')::int AS students, COUNT(*) FILTER(WHERE role='dsa')::int AS dsa_total, COUNT(*) FILTER(WHERE role='dsa' AND is_active AND is_verified)::int AS dsa_active, COUNT(*) FILTER(WHERE role='admin' AND is_active)::int AS admins, COUNT(*) FILTER(WHERE NOT is_verified)::int AS unverified, COUNT(*) FILTER(WHERE NOT is_active)::int AS suspended FROM users`),
 db.any(`SELECT approval_status,operational_status,COUNT(*)::int AS count FROM trips GROUP BY approval_status,operational_status ORDER BY approval_status,operational_status`),
 db.one(`SELECT COUNT(*)::int AS count FROM trips WHERE is_active AND approval_status='pending_dsa'`),
 db.one(`SELECT COUNT(*)::int AS count FROM trips WHERE is_active AND approval_status='approved' AND operational_status='planned' AND start_date >= (NOW() AT TIME ZONE 'Asia/Thimphu')::date`),
 db.any(`SELECT a.action,a.target_type,a.target_id,a.created_at,u.name AS actor FROM admin_audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC,a.id DESC LIMIT 8`)]);return {users,tripStats,reviewCount:reviewCount.count,upcomingTrips:upcomingTrips.count,recentAudit};}
async function list(section,query={}){const db=getDb();if(section==='users'){
 const page=Math.max(1,Number.parseInt(query.page,10)||1),limit=25,offset=(page-1)*limit;
 const search=String(query.q||'').trim().slice(0,100),role=['student','dsa','admin'].includes(query.role)?query.role:null;
 const verified=['true','false'].includes(query.verified)?query.verified==='true':null,active=['true','false'].includes(query.active)?query.active==='true':null;
 const where=`WHERE ($1='' OR u.name ILIKE '%'||$1||'%' OR u.email ILIKE '%'||$1||'%') AND ($2::text IS NULL OR u.role=$2) AND ($3::boolean IS NULL OR u.is_verified=$3) AND ($4::boolean IS NULL OR u.is_active=$4)`;
 const [rows,count]=await Promise.all([db.any(`SELECT u.id,u.name,u.email,u.role,u.is_active,u.is_verified,u.student_id,p.name AS programme,u.created_at,CASE WHEN u.role<>'dsa' OR u.is_verified THEN NULL WHEN u.verification_token IS NULL THEN 'Invitation unavailable' WHEN u.verification_token_expires<=NOW() THEN 'Invitation expired' ELSE 'Invitation pending' END AS invitation_status FROM users u LEFT JOIN programmes p ON p.id=u.programme_id ${where} ORDER BY u.created_at DESC,u.id DESC LIMIT $5 OFFSET $6`,[search,role,verified,active,limit,offset]),db.one(`SELECT COUNT(*)::int AS total FROM users u ${where}`,[search,role,verified,active])]);
 return {rows,page,pages:Math.max(1,Math.ceil(count.total/limit)),total:count.total,filters:{q:search,role:role||'',verified:query.verified||'',active:query.active||''}};
}
 if(section==='programmes')return db.any('SELECT id,code,name,is_active FROM programmes ORDER BY name,id');
 if(section==='destinations')return db.any('SELECT id,name,slug,dzongkhag,description,best_season,transport,entry_fee_note,practical_tip,is_active FROM destinations ORDER BY name,id');
 if(section==='photos')return db.any('SELECT p.id,p.destination_id,d.name AS destination,p.file_path,p.alt_text,p.photo_credit,p.sort_order FROM destination_photos p JOIN destinations d ON d.id=p.destination_id ORDER BY d.name,p.sort_order,p.id');
 if(CONTENT[section])return db.any(`SELECT * FROM ${section} ORDER BY sort_order,id`);
 throw fail('Unknown management section',404);
}
async function update(section,id,body,actorId){if(!validId(id))throw fail('Invalid ID');const db=getDb();
 if(section==='users'){
  const active=body.is_active==='true';return db.tx(async t=>{
   await t.one('SELECT pg_advisory_xact_lock($1,$2)',[71342,1]);
   const row=await t.oneOrNone('SELECT id,role,is_active FROM users WHERE id=$1 FOR UPDATE',[id]);if(!row)throw fail('User not found',404);
   if(Number(id)===Number(actorId)&&!active)throw fail('You cannot deactivate your own account');
   if(row.role==='admin'&&!active){const other=await t.one(`SELECT COUNT(*)::int AS count FROM users WHERE role='admin' AND is_active=true AND id<>$1`,[id]);if(other.count===0)throw fail('Cannot deactivate the last active Superadmin');}
   const changed=Boolean(row.is_active)!==active;
   await t.none('UPDATE users SET is_active=$1 WHERE id=$2',[active,id]);
   if(changed)await t.none(`INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id,context) VALUES($1,$2,'user',$3,$4)`,[actorId,active?'account_reactivated':'account_suspended',id,JSON.stringify({role:row.role})]);
  });
 }
 if(section==='photos'){
  const alt=trimmed(body.alt_text,250),credit=trimmed(body.photo_credit,250),sort=Number(body.sort_order);
  if(!alt||!Number.isSafeInteger(sort)||sort<0||sort>9999)throw fail('Invalid photo metadata');
  const result=await db.result('UPDATE destination_photos SET alt_text=$1,photo_credit=$2,sort_order=$3 WHERE id=$4',[alt,credit,sort,id]);if(!result.rowCount)throw fail('Photo not found',404);await audit(actorId,'destination_photo_updated','destination_photo',id);return;
 }
 let data={};if(section==='programmes'){data={code:trimmed(body.code,30),name:trimmed(body.name,150),is_active:body.is_active==='true'};if(!data.code||!data.name)throw fail('Programme code and name required');}
 else if(section==='destinations'){data={name:trimmed(body.name,150),dzongkhag:trimmed(body.dzongkhag,120),description:trimmed(body.description,7000),best_season:trimmed(body.best_season,300),transport:trimmed(body.transport,500),entry_fee_note:trimmed(body.entry_fee_note,500),practical_tip:trimmed(body.practical_tip,1000),is_active:body.is_active==='true'};if(!data.name||!data.dzongkhag||!data.description)throw fail('Name, Dzongkhag and description required');}
 else if(CONTENT[section]){const fields=CONTENT[section].fields;for(const field of fields){if(field==='is_active')data[field]=body[field]==='true';else if(field==='sort_order'){const n=Number(body[field]);if(!Number.isSafeInteger(n)||n<0||n>9999)throw fail('Invalid sort order');data[field]=n;}else data[field]=trimmed(body[field],field==='answer'||field==='body'||field==='quote'?4000:250);} const required=section==='faqs'?['question','answer']:section==='trip_rules'?['title','body']:['title','quote'];if(required.some(k=>!data[k]))throw fail('Required fields cannot be blank');}
 else throw fail('Unsupported section',404);
 const fields=Object.keys(data),args=Object.values(data);args.push(id);
 const result=await db.result(`UPDATE ${section} SET ${fields.map((k,i)=>`${k}=$${i+1}`).join(',')} WHERE id=$${args.length}`,args);
 if(!result.rowCount)throw fail('Record not found',404);
 await audit(actorId,section==='faqs'?'faq_updated':section==='trip_rules'?'guideline_updated':section==='destinations'?'destination_updated':'content_updated',section,id);
}
async function create(section,body,actorId){if(!['programmes','faqs','trip_rules','testimonials'].includes(section))throw fail('Creation not supported here');const db=getDb();
 if(section==='programmes'){const code=trimmed(body.code,30),name=trimmed(body.name,150);if(!code||!name)throw fail('Code and name required');const created=await db.one('INSERT INTO programmes(code,name) VALUES($1,$2) RETURNING id',[code,name]);await audit(actorId,'programme_created','programme',created.id);return;}
 const data=CONTENT[section].fields;const vals=data.map(f=>f==='is_active'?true:f==='sort_order'?0:trimmed(body[f],f==='answer'||f==='body'||f==='quote'?4000:250));
 if(!vals[0]||!vals[1])throw fail('Required content missing');const created=await db.one(`INSERT INTO ${section}(${data.join(',')}) VALUES(${data.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING id`,vals);await audit(actorId,section==='faqs'?'faq_created':section==='trip_rules'?'guideline_created':'content_created',section,created.id);
}
async function createDestination(body,actorId){
 const name=trimmed(body.name,150),slug=trimmed(body.slug,160).toLowerCase(),dzongkhag=trimmed(body.dzongkhag,120),description=trimmed(body.description,7000);
 if(!name||!dzongkhag||!description||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw fail('Name, slug, dzongkhag and description required');
 const created=await getDb().one('INSERT INTO destinations(name,slug,dzongkhag,description) VALUES($1,$2,$3,$4) RETURNING id',[name,slug,dzongkhag,description]);await audit(actorId,'destination_created','destination',created.id);
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
async function publicHelp(){const db=getDb();const [faqs,guidelines]=await Promise.all([db.any('SELECT id,question,answer,sort_order FROM faqs WHERE is_active=true ORDER BY sort_order,id'),db.any('SELECT id,title,body,sort_order FROM trip_rules WHERE is_active=true ORDER BY sort_order,id')]);return {faqs,guidelines};}
async function monitoring(query={}){const q=String(query.q||'').trim().slice(0,100),status=['pending_dsa','approved','rejected','changes_requested'].includes(query.status)?query.status:null;return getDb().any(`SELECT t.id,t.title,t.approval_status,t.operational_status,t.start_date,t.end_date,u.name AS proposer,d.name AS destination,lead.name AS coordinator,COALESCE(p.count,0)::int AS participants,final.review_status AS final_status FROM trips t JOIN users u ON u.id=t.proposed_by_user_id JOIN destinations d ON d.id=t.destination_id LEFT JOIN LATERAL(SELECT x.name FROM trip_coordinators c JOIN users x ON x.id=c.user_id WHERE c.trip_id=t.id AND c.status='active' AND c.assignment_role='lead' LIMIT 1) lead ON TRUE LEFT JOIN LATERAL(SELECT COUNT(*) AS count FROM participants p WHERE p.trip_id=t.id AND p.status='approved') p ON TRUE LEFT JOIN LATERAL(SELECT r.review_status FROM final_participant_submissions r WHERE r.trip_id=t.id ORDER BY r.submission_number DESC LIMIT 1) final ON TRUE WHERE ($1='' OR t.title ILIKE '%'||$1||'%' OR d.name ILIKE '%'||$1||'%' OR u.name ILIKE '%'||$1||'%') AND ($2::text IS NULL OR t.approval_status=$2) ORDER BY t.start_date DESC,t.id DESC LIMIT 250`,[q,status]);}
async function tripDetail(id){if(!validId(id))return null;return getDb().oneOrNone(`SELECT t.id,t.title,t.purpose,t.approval_status,t.operational_status,t.start_date,t.end_date,t.created_at,t.registration_open,u.name AS proposer,d.name AS destination,COALESCE((SELECT COUNT(*) FROM participants p WHERE p.trip_id=t.id AND p.status='approved'),0)::int AS participants,COALESCE((SELECT string_agg(x.name||' ('||c.assignment_role||')',', ' ORDER BY c.assignment_role,x.name) FROM trip_coordinators c JOIN users x ON x.id=c.user_id WHERE c.trip_id=t.id AND c.status='active'),'No active coordinator assignment') AS coordinators,(SELECT r.review_status FROM final_participant_submissions r WHERE r.trip_id=t.id ORDER BY r.submission_number DESC LIMIT 1) AS final_status FROM trips t JOIN users u ON u.id=t.proposed_by_user_id JOIN destinations d ON d.id=t.destination_id WHERE t.id=$1`,[id]);}
async function auditLogs(query={}){const q=String(query.q||'').trim().slice(0,100);return getDb().any(`SELECT a.id,a.action,a.target_type,a.target_id,a.created_at,u.name AS actor FROM admin_audit_logs a LEFT JOIN users u ON u.id=a.actor_id WHERE ($1='' OR a.action ILIKE '%'||$1||'%' OR a.target_type ILIKE '%'||$1||'%' OR u.name ILIKE '%'||$1||'%') ORDER BY a.created_at DESC,a.id DESC LIMIT 200`,[q]);}
async function reports(){return getDb().any(`SELECT 'Users by role' AS group_name,role AS label,COUNT(*)::int AS value FROM users GROUP BY role UNION ALL SELECT 'Trip proposal status',approval_status,COUNT(*)::int FROM trips GROUP BY approval_status UNION ALL SELECT 'Trip operational status',operational_status,COUNT(*)::int FROM trips GROUP BY operational_status UNION ALL SELECT 'Account verification',CASE WHEN is_verified THEN 'Verified' ELSE 'Unverified' END,COUNT(*)::int FROM users GROUP BY is_verified UNION ALL SELECT 'Account status',CASE WHEN is_active THEN 'Active' ELSE 'Suspended' END,COUNT(*)::int FROM users GROUP BY is_active ORDER BY 1,2`);}
module.exports={dashboard,list,update,create,dsaHistory,createDestination,addPhoto,photoById,publicHelp,monitoring,tripDetail,auditLogs,reports,audit,CONTENT,fail};
