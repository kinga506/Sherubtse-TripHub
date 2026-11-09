const M=require('../models/SiteAdmin');
const {getDb}=require('../config/db');
const bcrypt=require('bcrypt');
const {getStorage}=require('../config/storage');
const asyncPage=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const error=(e,res,next)=>e.status?res.status(e.status).send(e.message):next(e);
const overview=asyncPage(async(req,res)=>res.render('admin/dashboard',{title:'Superadmin dashboard',...await M.dashboard()}));
const manage=asyncPage(async(req,res)=>{const section=req.params.section;res.render('admin/manage',{title:'Manage '+section,section,rows:await M.list(section)});});
const save=async(req,res,next)=>{try{await M.update(req.params.section,req.params.id,req.body,req.currentUser.id);return res.redirect('/workspace/superadmin/manage/'+req.params.section);}catch(e){return error(e,res,next);}};
const create=async(req,res,next)=>{try{await M.create(req.params.section,req.body);return res.redirect('/workspace/superadmin/manage/'+req.params.section);}catch(e){return error(e,res,next);}};
const createDsa=async(req,res,next)=>{try{
 const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');
 if(!name||name.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||Buffer.byteLength(password)>72) return res.status(422).send('Valid name, email and password (12–72 bytes) required');
 const hash=await bcrypt.hash(password,12);
 await getDb().none(`INSERT INTO users(name,email,password_hash,role,is_verified,is_active) VALUES($1,$2,$3,'dsa',true,true)`,[name,email,hash]);
 return res.redirect('/workspace/superadmin/manage/users');
 }catch(e){if(e.code==='23505')return res.status(409).send('Email already in use');next(e);}};
const destinationCreate=async(req,res,next)=>{try{await M.createDestination(req.body);res.redirect('/workspace/superadmin/manage/destinations');}catch(e){error(e,res,next);}};
const photoUpload=async(req,res,next)=>{let key;try{
 const bytes=req.file?.buffer;
 if(!bytes||bytes.length<16)return res.status(422).send('Image required');
 const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(!jpg&&!png)return res.status(422).send('Only genuine PNG or JPEG images allowed');
 const uploaded=await getStorage().put(bytes,jpg?'image/jpeg':'image/png');key=uploaded.key;
 await M.addPhoto(req.body.destination_id,key,req.body.alt_text,req.body.photo_credit);
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
module.exports={overview,manage,save,create,createDsa,destinationCreate,photoUpload,servePhoto,history};
