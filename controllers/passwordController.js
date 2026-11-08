const crypto=require('node:crypto');
const bcrypt=require('bcrypt');
const User=require('../models/User');
const PasswordReset=require('../models/PasswordReset');
const {sendEmail}=require('../services/mailer');

const TOKEN_REGEX=/^[a-f0-9]{64}$/;
const GENERIC_MESSAGE='If the account is eligible, password-reset instructions will be sent to that email address.';
const normalizeEmail=email=>String(email||'').trim().toLowerCase();
const validPassword=password=>typeof password==='string' && password.length>=12 && password.length<=72;
const hashToken=token=>crypto.createHash('sha256').update(token).digest('hex');
function resetUrl(token) {
  const base=process.env.APP_URL || 'http://localhost:3000';
  const url=new URL(base);
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname!=='/') throw new Error('Invalid APP_URL');
  if (process.env.NODE_ENV==='production' && url.protocol!=='https:') throw new Error('Production APP_URL must use HTTPS');
  return new URL(`/auth/reset-password?token=${encodeURIComponent(token)}`,url).toString();
}
function showForgot(req,res) {res.render('auth/forgot-password',{title:'Forgot password',error:null});}
async function forgot(req,res,next) {
  try {
    const email=normalizeEmail(req.body.email);
    if (email.length<=254 && email.includes('@')) {
      const user=await User.findByEmail(email);
      if (user && user.is_active && user.is_verified && ['student','dsa','admin'].includes(user.role)) {
        const raw=crypto.randomBytes(32).toString('hex');
        const hash=hashToken(raw);
        await PasswordReset.issueToken(user.id,hash,new Date(Date.now()+60*60*1000));
        try {
          await sendEmail({to:user.email,subject:'Reset your Sherubtse TripHub password',
            text:`Use this single-use link within one hour to reset your password: ${resetUrl(raw)}\nIf you did not request this, ignore the email.`});
        } catch(error) {
          // Never reveal whether an account exists; do not print reset links or tokens.
          console.error('Password recovery email delivery failed:',error.message);
        }
      }
    }
    return res.render('auth/message',{title:'Check your email',message:GENERIC_MESSAGE});
  } catch(error){next(error);}
}
async function showReset(req,res,next) {
  try {
    const token=req.query.token;
    if(typeof token!=='string'||!TOKEN_REGEX.test(token) || !(await PasswordReset.findValidToken(hashToken(token))))
      return res.status(400).render('auth/reset-invalid',{title:'Reset link unavailable'});
    return res.set('Referrer-Policy','no-referrer').set('Cache-Control','no-store').render('auth/reset-password',{title:'Reset password',token,error:null});
  } catch(error){next(error);}
}
async function reset(req,res,next) {
  try {
    const {token,newPassword,confirmPassword}=req.body;
    if(typeof token!=='string'||!TOKEN_REGEX.test(token)) return res.status(400).render('auth/reset-invalid',{title:'Reset link unavailable'});
    const digest=hashToken(token);
    if(!(await PasswordReset.findValidToken(digest))) return res.status(400).render('auth/reset-invalid',{title:'Reset link unavailable'});
    if(!validPassword(newPassword)||newPassword!==confirmPassword) return res.status(400).set('Referrer-Policy','no-referrer').render('auth/reset-password',
      {title:'Reset password',token,error:'Use a matching password of 12–72 characters.'});
    const passwordHash=await bcrypt.hash(newPassword,12);
    if(!(await PasswordReset.consumeTokenAndChangePassword(digest,passwordHash))) return res.status(400).render('auth/reset-invalid',{title:'Reset link unavailable'});
    // In addition to database session deletion, clear this browser's cookie.
    if(req.session) return req.session.destroy(err=>{if(err)return next(err);res.clearCookie('triphub.sid');res.render('auth/message',
      {title:'Password reset',message:'Your password has been reset. Please log in again on all devices.'});});
    return res.render('auth/message',{title:'Password reset',message:'Your password has been reset. Please log in again on all devices.'});
  } catch(error){next(error);}
}
function showChange(req,res) {res.render('auth/change-password',{title:'Change password',error:null});}
async function change(req,res,next) {
  try {
    const {currentPassword,newPassword,confirmPassword}=req.body;
    const errorView=message=>res.status(400).render('auth/change-password',{title:'Change password',error:message});
    if(!validPassword(newPassword)||newPassword!==confirmPassword) return errorView('Use a matching new password of 12–72 characters.');
    const user=await User.findById(req.currentUser.id);
    if(!user || !(await bcrypt.compare(String(currentPassword||''),user.password_hash))) return errorView('Current password is incorrect.');
    if(await bcrypt.compare(newPassword,user.password_hash)) return errorView('Choose a password different from your current one.');
    const newHash=await bcrypt.hash(newPassword,12);
    if(!(await PasswordReset.changePassword(user.id,user.password_hash,newHash))) return errorView('Password could not be changed. Please try again.');
    req.session.destroy(err=>{if(err)return next(err);res.clearCookie('triphub.sid');res.redirect('/auth/login?password=changed');});
  } catch(error){next(error);}
}
module.exports={TOKEN_REGEX,GENERIC_MESSAGE,validPassword,hashToken,resetUrl,showForgot,forgot,showReset,reset,showChange,change};
