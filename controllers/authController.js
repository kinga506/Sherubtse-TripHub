const crypto=require('node:crypto');
const bcrypt=require('bcrypt');
const User=require('../models/User');
const {sendEmail}=require('../services/mailer');
const EMAIL_RE=/^[0-9]+\.sherubtse@rub\.edu\.bt$/;
const SIGNUP_GENERIC_MESSAGE='If the account is eligible, verification instructions will be sent to that Sherubtse email address. Check your inbox (and spam folder); you must verify your email before logging in. If no email arrives, use Resend verification.';
function normalizeEmail(value) {return String(value||'').trim().toLowerCase();}
function validStudentEmail(email) {return EMAIL_RE.test(email);}
function makeToken() { const raw=crypto.randomBytes(32).toString('hex'); return {raw,hash:crypto.createHash('sha256').update(raw).digest('hex')}; }
function render(res,page,options={}) {return res.render('auth/'+page,{...options,title:options.title||'Sherubtse TripHub'});}
const showSignup=(req,res)=>render(res,'signup',{title:'Student signup',error:null});
async function signup(req,res,next) {
  try {
    const {name, password, confirmPassword}=req.body;
    const email=normalizeEmail(req.body.email);
    if ('role' in req.body || 'is_verified' in req.body) return res.status(400).send('Role cannot be selected');
    if(!validStudentEmail(email) || !name || !String(name).trim() || String(name).length>100 || !password || password.length<12 || password.length>72 || password!==confirmPassword)
      return res.status(400).render('auth/signup',{title:'Student signup',error:'Check your college email, name and matching passwords (12–72 characters).'});
    const studentId=email.split('.')[0];
    const found=await User.findByEmail(email);
    if(found) return res.status(200).render('auth/message',{title:'Check your email',message:SIGNUP_GENERIC_MESSAGE});
    const {raw,hash}=makeToken();
    const passwordHash=await bcrypt.hash(password,12);
    await User.createStudent({name:name.trim(),email,passwordHash,studentId,tokenHash:hash,expiresAt:new Date(Date.now()+60*60*1000)});
    const url=`${process.env.APP_URL||'http://localhost:3000'}/auth/verify?token=${encodeURIComponent(raw)}`;
    try { await sendEmail({to:email,subject:'Verify your Sherubtse TripHub account',text:`Verify your email within one hour: ${url}\nIf you did not sign up, ignore this email.`}); }
    catch(err) {console.error('Verification email delivery failed:',err.message);}
    return render(res,'message',{title:'Check your email',message:SIGNUP_GENERIC_MESSAGE});
  } catch(err) { if(err.code==='23505') return res.status(200).render('auth/message',{title:'Check your email',message:SIGNUP_GENERIC_MESSAGE}); next(err); }
}
async function verify(req,res,next) {
  try {
    const token=req.query.token;
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)) return res.status(400).send('Verification link invalid or expired');
    const hash=crypto.createHash('sha256').update(token).digest('hex');
    const account=await User.verifyToken(hash);
    if(!account) return res.status(400).send('Verification link invalid or expired');
    return render(res,'message',{title:'Email verified',message:'Email verified. You can now log in.'});
  } catch(err){next(err);}
}
const showLogin=(req,res)=>render(res,'login',{title:'Log in',error:null});
async function login(req,res,next) {
  try {
    const email=normalizeEmail(req.body.email); const password=String(req.body.password||'');
    const user=await User.findByEmail(email);
    const valid=user && await bcrypt.compare(password,user.password_hash);
    if (!valid || !user.is_verified || !user.is_active) return res.status(401).render('auth/login',{title:'Log in',error:'Invalid credentials or account not verified/active.'});
    req.session.regenerate(err=>{
      if(err) return next(err);
      req.session.userId=user.id;
      req.session.save(err=>err?next(err):res.redirect('/account'));
    });
  } catch(err){next(err);}
}
function logout(req,res,next) {
  req.session.destroy(err=>{if(err)return next(err);res.clearCookie('triphub.sid');res.redirect('/auth/login');});
}
async function resend(req,res,next) {
  try {
    const email=normalizeEmail(req.body.email);
    if(validStudentEmail(email)) {
      const user=await User.findByEmail(email);
      if(user && user.role==='student' && !user.is_verified && user.is_active) {
        const {raw,hash}=makeToken();
        const changed=await User.setVerificationToken(user.id,hash,new Date(Date.now()+3600000));
        if(changed) {
          const url=`${process.env.APP_URL||'http://localhost:3000'}/auth/verify?token=${encodeURIComponent(raw)}`;
          try {await sendEmail({to:email,subject:'Verify your Sherubtse TripHub account',text:`This link expires in one hour: ${url}`});}
          catch(error){console.error('Resend verification delivery failed:',error.message);}
        }
      }
    }
    return render(res,'message',{title:'Verification requested',message:'If eligible, you will receive verification instructions.'});
  } catch(error){next(error);}
}
function showResend(req,res) {return render(res,'resend',{title:'Resend verification'});}
function account(req,res) {return render(res,'account',{title:'My account',user:req.currentUser});}
module.exports={EMAIL_RE,validStudentEmail,normalizeEmail,showSignup,signup,verify,showLogin,login,logout,resend,showResend,account};
