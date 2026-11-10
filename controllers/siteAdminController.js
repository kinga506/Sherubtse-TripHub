const M=require('../models/SiteAdmin');
const {getDb}=require('../config/db');
const bcrypt=require('bcrypt');
const crypto=require('node:crypto');
const {getStorage}=require('../config/storage');
const {sendEmail}=require('../services/mailer');
const {authLimiter}=require('../middleware/security');
const asyncPage=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const error=(e,res,next)=>e.status?res.status(e.status).send(e.message):next(e);
const overview=asyncPage(async(req,res)=>res.render('admin/dashboard',{title:'Overview',...await M.dashboard()}));
const manage=asyncPage(async(req,res)=>{const section=req.params.section,result=await M.list(section,req.query);res.render('admin/manage',{title:section==='users'?'User Management':'Content Management',section,rows:section==='users'?result.rows:result,userPage:section==='users'?result:null,destinations:section==='photos'?await getDb().any('SELECT id,name FROM destinations WHERE is_active ORDER BY name'):[]});});
const save=async(req,res,next)=>{try{await M.update(req.params.section,req.params.id,req.body,req.currentUser.id);return res.redirect('/workspace/superadmin/manage/'+req.params.section);}catch(e){return error(e,res,next);}};
const create=async(req,res,next)=>{try{await M.create(req.params.section,req.body,req.currentUser.id);return res.redirect('/workspace/superadmin/manage/'+req.params.section);}catch(e){return error(e,res,next);}};
const createDsa=async(req,res,next)=>{try{
 const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase();
 if(!name||name.length>100||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(422).send('Valid name and email required');
 const raw=crypto.randomBytes(32).toString('hex'),token=crypto.createHash('sha256').update(raw).digest('hex');
 const unusablePassword=await bcrypt.hash(crypto.randomBytes(48).toString('hex'),12);
 const created=await getDb().one(`INSERT INTO users(name,email,password_hash,role,is_verified,verification_token,verification_token_expires) VALUES($1,$2,$3,'dsa',false,$4,NOW()+INTERVAL '1 hour') RETURNING id`,[name,email,unusablePassword,token]);
 await M.audit(req.currentUser.id,'dsa_invitation_created','user',created.id);
 try{const base=process.env.APP_URL||'http://localhost:3000';const url=new URL(base);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('Invalid APP_URL');if(process.env.NODE_ENV==='production'&&url.protocol!=='https:')throw new Error('Production APP_URL must use HTTPS');const invitation=new URL(`/auth/verify?token=${encodeURIComponent(raw)}`,url).toString();await sendEmail({to:email,subject:'Activate your Sherubtse TripHub DSA account',text:`Verify your email within one hour: ${invitation}\nAfter verification, use Forgot password to establish your password. If you did not expect this invitation, ignore this email.`});}
 catch(mailError){console.error('DSA invitation email delivery failed:',mailError.message);await getDb().none(`UPDATE users SET is_active=false,verification_token=NULL,verification_token_expires=NULL WHERE id=$1`,[created.id]);await M.audit(req.currentUser.id,'dsa_invitation_delivery_failed','user',created.id);return res.redirect('/workspace/superadmin/manage/users?invitation=delivery-failed');}
 return res.redirect('/workspace/superadmin/manage/users?dsa=created');
 }catch(e){if(e.code==='23505')return res.status(409).send('Email already in use');next(e);}};
const destinationCreate=async(req,res,next)=>{try{await M.createDestination(req.body,req.currentUser.id);res.redirect('/workspace/superadmin/manage/destinations');}catch(e){error(e,res,next);}};
const photoUpload=async(req,res,next)=>{let key;try{
 const bytes=req.file?.buffer;
 if(!bytes||bytes.length<16)return res.status(422).send('Image required');
 const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(!jpg&&!png)return res.status(422).send('Only genuine PNG or JPEG images allowed');
 const uploaded=await getStorage().put(bytes,jpg?'image/jpeg':'image/png');key=uploaded.key;
 const photo=await M.addPhoto(req.body.destination_id,key,req.body.alt_text,req.body.photo_credit);
 await M.audit(req.currentUser.id,'destination_photo_added','destination_photo',photo.id);
 res.redirect('/workspace/superadmin/manage/photos');
 }catch(e){if(key){try{await getStorage().delete(key);}catch(_) { /* cleanup best-effort */ }}error(e,res,next);}};
const servePhoto=async(req,res,next)=>{try{
 const photo=await M.photoById(req.params.photoId);if(!photo||!photo.is_active)return res.status(404).send('Not found');
 // Only keys written by this upload path are returned; existing static photos remain in /public.
 if(!/^[a-f0-9]{32}$/.test(photo.file_path))return res.status(404).send('Not found');
 const data=await getStorage().get(photo.file_path);
 const png=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 res.set('Content-Type',png?'image/png':'image/jpeg').set('X-Content-Type-Options','nosniff').set('Cache-Control','public,max-age=3600').send(data);
 }catch(e){next(e);}};
const history=asyncPage(async(req,res)=>res.render('dsa/history',{title:'DSA review and completion history',...await M.dsaHistory()}));
const help=asyncPage(async(req,res)=>res.render('help',{title:'Help & Frequently Asked Questions',...await M.publicHelp()}));
const monitoring=asyncPage(async(req,res)=>res.render('admin/monitoring',{title:'Trip Monitoring',query:req.query,trips:await M.monitoring(req.query)}));
const tripDetail=asyncPage(async(req,res)=>{const trip=await M.tripDetail(req.params.id);if(!trip)return res.sendStatus(404);res.render('admin/trip-detail',{title:'Trip progress',trip});});
const auditLogs=asyncPage(async(req,res)=>res.render('admin/audit',{title:'Audit Logs',query:req.query,logs:await M.auditLogs(req.query)}));
const reports=asyncPage(async(req,res)=>res.render('admin/reports',{title:'Reports',rows:await M.reports()}));
const reportsCsv=asyncPage(async(req,res)=>{const rows=await M.reports();const cell=value=>{let v=String(value??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return `"${v.replaceAll('"','""')}"`;};const csv=[['Report','Category','Count'],...rows.map(r=>[r.group_name,r.label,r.value])].map(r=>r.map(cell).join(',')).join('\r\n');res.type('text/csv').set('Content-Disposition','attachment; filename="triphub-report.csv"').send(csv);});
const userDetail=asyncPage(async(req,res)=>{if(!/^\d+$/.test(req.params.id))return res.sendStatus(404);const user=await getDb().oneOrNone(`SELECT u.id,u.name,u.email,u.role,u.student_id,u.created_at,u.is_verified,u.is_active,p.name AS programme FROM users u LEFT JOIN programmes p ON p.id=u.programme_id WHERE u.id=$1`,[req.params.id]);if(!user)return res.sendStatus(404);res.render('admin/user',{title:'User details',user});});
const resendDsaInvitation=async(req,res,next)=>{try{if(!/^\d{1,15}$/.test(req.params.id))return res.sendStatus(404);const user=await getDb().oneOrNone(`SELECT id,email FROM users WHERE id=$1 AND role='dsa' AND is_verified=false`,[req.params.id]);if(!user)return res.sendStatus(404);const raw=crypto.randomBytes(32).toString('hex'),token=crypto.createHash('sha256').update(raw).digest('hex');await getDb().none(`UPDATE users SET verification_token=$1,verification_token_expires=NOW()+INTERVAL '1 hour',is_active=true WHERE id=$2`,[token,user.id]);const base=process.env.APP_URL||'http://localhost:3000',url=new URL(base);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||(process.env.NODE_ENV==='production'&&url.protocol!=='https:'))throw new Error('Invalid APP_URL');await sendEmail({to:user.email,subject:'Activate your Sherubtse TripHub DSA account',text:`Verify your email within one hour: ${new URL(`/auth/verify?token=${encodeURIComponent(raw)}`,url)}\nAfter verification, use Forgot password to establish your password.`});await M.audit(req.currentUser.id,'dsa_invitation_resent','user',user.id);return res.redirect(`/workspace/superadmin/users/${user.id}`);}catch(e){next(e);}};
const changeAdminEmail=async(req,res,next)=>{try{
 const nextEmail=String(req.body.email||'').trim().toLowerCase();
 const currentPassword=String(req.body.currentPassword||'');
 if(nextEmail.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail))return res.status(422).send('Enter a valid email address');
 if(!currentPassword||Buffer.byteLength(currentPassword)>72)return res.status(422).send('Current password is required');
 const user=await getDb().one(`SELECT id,email,password_hash FROM users WHERE id=$1 AND role='admin' AND is_active=true AND is_verified=true`,[req.currentUser.id]);
 if(!(await bcrypt.compare(currentPassword,user.password_hash)))return res.status(422).send('Current password is incorrect');
 if(nextEmail===user.email.toLowerCase())return res.status(422).send('Enter a different email address');
 const base=process.env.APP_URL||'http://localhost:3000',url=new URL(base);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||(process.env.NODE_ENV==='production'&&url.protocol!=='https:'))throw new Error('Invalid APP_URL');
 const raw=crypto.randomBytes(32).toString('hex');
 const token=crypto.createHash('sha256').update(raw).digest('hex');
 await getDb().tx(async tx=>{
  const current=await tx.oneOrNone(`SELECT id,email FROM users WHERE id=$1 AND role='admin' AND is_active=true AND is_verified=true FOR UPDATE`,[user.id]);
  if(!current)throw Object.assign(new Error('Account is no longer eligible for this change'),{status:403});
  if(nextEmail===current.email.toLowerCase())throw Object.assign(new Error('Enter a different email address'),{status:422});
  const duplicate=await tx.oneOrNone(`SELECT id FROM users WHERE (LOWER(email)=LOWER($1) OR LOWER(pending_email)=LOWER($1)) AND id<>$2`,[nextEmail,user.id]);
  if(duplicate)throw Object.assign(new Error('Email address is already in use or awaiting verification'),{status:409});
  await tx.none(`UPDATE users SET pending_email=$1,pending_email_token=$2,pending_email_expires=NOW()+INTERVAL '1 hour' WHERE id=$3`,[nextEmail,token,user.id]);
  await tx.none(`INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id) VALUES($1,'admin_email_change_requested','user',$1)`,[user.id]);
 });
 try{await sendEmail({to:nextEmail,subject:'Verify your new Sherubtse TripHub email',text:`Confirm this email address within one hour: ${new URL(`/auth/verify-admin-email?token=${encodeURIComponent(raw)}`,url)}\nYour current login email remains unchanged until verification.`});}
 catch(mailError){await getDb().tx(async tx=>{await tx.none(`UPDATE users SET pending_email=NULL,pending_email_token=NULL,pending_email_expires=NULL WHERE id=$1 AND pending_email_token=$2`,[user.id,token]);await tx.none(`INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id) VALUES($1,'admin_email_change_delivery_failed','user',$1)`,[user.id]);});console.error('Superadmin email verification delivery failed.');return res.redirect('/account?emailChange=delivery-failed');}
 return res.redirect('/account?emailChange=sent');
}catch(e){if(e.code==='23505'||e.status===409)return res.status(409).send('Email address is already in use or awaiting verification');if(e.status)return res.status(e.status).send(e.message);next(e);}};
const updateAdminProfile=async(req,res,next)=>{try{const name=String(req.body.name||'').trim(),password=String(req.body.currentPassword||'');if(!name||name.length>100)return res.status(422).send('Name must be between 1 and 100 characters');const user=await getDb().one(`SELECT id,password_hash FROM users WHERE id=$1 AND role='admin' AND is_active=true`,[req.currentUser.id]);if(!(await bcrypt.compare(password,user.password_hash)))return res.status(422).send('Current password is incorrect');await getDb().none('UPDATE users SET name=$1 WHERE id=$2',[name,user.id]);await M.audit(user.id,'admin_profile_updated','user',user.id);return res.redirect('/account?profile=updated');}catch(e){next(e);}};
const verifyAdminEmail=async(req,res,next)=>{try{
 const raw=req.query.token;
 if(typeof raw!=='string'||!/^[a-f0-9]{64}$/.test(raw))return res.status(400).render('auth/message',{title:'Email change link unavailable',message:'This email change link is invalid or expired.'});
 const token=crypto.createHash('sha256').update(raw).digest('hex');
 const updated=await getDb().tx(async tx=>{
  const row=await tx.oneOrNone(`SELECT id,email FROM users WHERE pending_email_token=$1 AND pending_email_expires>NOW() AND role='admin' AND is_active=true FOR UPDATE`,[token]);
  if(!row)return null;
  const result=await tx.one(`UPDATE users SET email=pending_email,is_verified=true,pending_email=NULL,pending_email_token=NULL,pending_email_expires=NULL WHERE id=$1 RETURNING id,email`,[row.id]);
  await tx.none(`INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id) VALUES($1,'admin_email_changed','user',$1)`,[row.id]);
  await tx.none(`DELETE FROM session WHERE sess->>'userId'=$1`,[String(row.id)]);
  return {id:row.id,oldEmail:row.email,newEmail:result.email};
 });
 if(!updated)return res.status(400).render('auth/message',{title:'Email change link unavailable',message:'This email change link is invalid or expired.'});
 try{await sendEmail({to:updated.oldEmail,subject:'Sherubtse TripHub email changed',text:`The login email for your account was changed to ${updated.newEmail}. If you did not make this change, contact your platform administrator.`});}catch(error){console.error('Previous email security notification could not be delivered.');}
 return res.render('auth/message',{title:'Email address updated',message:'Your new email address is verified and is now your login email. Please log in again.'});
}catch(e){next(e);}};
module.exports={overview,manage,save,create,createDsa,destinationCreate,photoUpload,servePhoto,history,help,monitoring,tripDetail,auditLogs,reports,reportsCsv,userDetail,resendDsaInvitation,changeAdminEmail,verifyAdminEmail,updateAdminProfile};
