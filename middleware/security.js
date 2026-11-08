const crypto = require('node:crypto');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../config/db');
const User = require('../models/User');
const Access = require('../models/Access');

const authLimiter = rateLimit({ windowMs:15*60*1000, limit:10, standardHeaders:'draft-8', legacyHeaders:false,
  message:'Too many requests. Try again later.' });
const resendLimiter = rateLimit({ windowMs:60*60*1000, limit:5, standardHeaders:'draft-8', legacyHeaders:false,
  message:'Too many requests. Try again later.' });
function ensureCsrf(req,res,next) {
  if (!req.session) return next(new Error('Session middleware required'));
  if (!req.session.csrfToken) req.session.csrfToken=crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken=req.session.csrfToken;
  if (!['POST','PUT','PATCH','DELETE'].includes(req.method)) return next();
  const candidate=req.body && req.body._csrf || req.get('x-csrf-token');
  if (typeof candidate!=='string') return res.status(403).send('Invalid CSRF token');
  const a=Buffer.from(candidate); const b=Buffer.from(req.session.csrfToken);
  if (a.length!==b.length || !crypto.timingSafeEqual(a,b)) return res.status(403).send('Invalid CSRF token');
  next();
}
async function loadUser(req,res,next) {
  try {
    res.locals.currentUser=null;
    res.locals.hasCoordinatingTrips=false;
    if (!req.session?.userId) return next();
    const user=await User.findById(req.session.userId);
    if (!user || !user.is_active || !user.is_verified) {
      req.session.userId=null;
      return next();
    }
    req.currentUser=user; res.locals.currentUser=user;
    if (user.role === 'student') {
      const assigned = await Access.coordinatingTripIds(user.id);
      res.locals.hasCoordinatingTrips = assigned.length > 0;
    }
    next();
  } catch(error) {next(error);}
}
const {requireAuth}=require('./authorization');
module.exports = {authLimiter,resendLimiter,ensureCsrf,loadUser,requireAuth};
