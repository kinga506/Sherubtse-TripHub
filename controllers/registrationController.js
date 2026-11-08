const Registration=require('../models/Registration');
const PublicTrip=require('../models/PublicTrip');
const Access=require('../models/Access');
const {enrich}=require('../services/tripDiscovery');
const {inspect}=require('../services/attachmentValidation');
const {getStorage}=require('../config/storage');
const {sendEmail}=require('../services/mailer');
const valid=Access.validId;
function fail(res,e,next){return e.status?res.status(e.status).send(e.message):next(e);}
async function joinPage(req,res,next){try{
 if(!valid(req.params.id))return res.status(404).send('Trip not found');
 const t=await PublicTrip.getById(req.params.id);if(!t)return res.status(404).send('Trip not found');
 const trip=enrich(t);
 const existing=await Registration.myRequest(t.id,req.currentUser.id);
 res.render('trips/join',{title:'Request to join',trip,existing});
}catch(e){next(e);}}
async function join(req,res,next){let saved;
 try{
  if(!valid(req.params.id))return res.status(404).send('Trip not found');
  if(req.body.accept_cost!=='yes'||req.body.accept_safety!=='yes'||req.body.confirm_available!=='yes')return res.status(422).send('Confirm cost, safety rules and availability');
  if(!req.file)return res.status(422).send('Upload a parent/guardian consent letter');
  const meta=await inspect(req.file);
  if(!['application/pdf','image/png','image/jpeg'].includes(meta.mime))return res.status(422).send('Consent letters must be PDF, JPG, JPEG or PNG');
  const reason=String(req.body.reason||'').trim();
  if(!reason||reason.length>1000)return res.status(422).send('Enter your joining reason (up to 1000 characters)');
  saved=await getStorage().put(req.file.buffer,meta.mime);
  await Registration.join(Number(req.params.id),req.currentUser.id,reason,meta,saved.key);
  res.redirect('/workspace/my-trips');
 }catch(e){if(saved)try{await getStorage().delete(saved.key);}catch(cleanup){console.error('Consent cleanup failed',cleanup.message);}fail(res,e,next);}
}

async function myTrips(req, res, next) {
  try {
    const Proposal = require('../models/Proposal');

    const [requests, proposals] = await Promise.all([
      Registration.myTrips(req.currentUser.id),
      Proposal.owned(req.currentUser.id)
    ]);

    res.render('trips/my-trips', {
      title: 'My Trips',
      requests,
      proposals
    });
  } catch (error) {
    next(error);
  }
}

async function withdraw(req,res,next){try{
 if(!valid(req.params.id))return res.status(404).send('Trip not found');
 if(req.body.confirm!=='yes')return res.status(422).send('Confirm your withdrawal');
 await Registration.withdraw(Number(req.params.id),req.currentUser.id,String(req.body.reason||'').trim());
 // Notifications are best effort; the committed withdrawal remains authoritative.
 try {const {getDb}=require('../config/db');const coordinators=await getDb().any("SELECT u.email,t.title FROM trip_coordinators tc JOIN users u ON u.id=tc.user_id JOIN trips t ON t.id=tc.trip_id WHERE tc.trip_id=$1 AND tc.status='active'",[req.params.id]);
 await Promise.all(coordinators.map(c=>sendEmail({to:c.email,subject:'Sherubtse TripHub: Participant withdrawal',text:`A participant withdrew from ${c.title}. Review the held vacancy and any final-list implications in TripHub.`}).catch(e=>console.error('Withdrawal notification failed:',e.message))));}catch(e){console.error('Withdrawal notification lookup failed:',e.message);}
 res.redirect('/workspace/my-trips');
}catch(e){fail(res,e,next);}}
async function coordinatorPage(req,res,next){try{
 const {getDb}=require('../config/db');
 const t=await getDb().one('SELECT * FROM trips WHERE id=$1',[req.params.tripId]);
 const c=await getDb().one(`SELECT COUNT(*) FILTER(WHERE status IN ('pending','approved'))::int AS occupied,COUNT(*) FILTER(WHERE status='approved')::int AS confirmed FROM participants WHERE trip_id=$1`,[t.id]);
 
res.render('trips/registration-management', {
  title: 'Manage registration',
  trip: t,
  occupied: Number(c.occupied),
  confirmed: Number(c.confirmed),

  queryError:
    typeof req.query.error === 'string'
      ? req.query.error
      : null,

  querySuccess:
    ['open', 'close', 'reopen'].includes(req.query.success)
      ? req.query.success
      : null
});

}catch(e){next(e);}}

async function coordinatorAction(req, res, next) {
  const tripId = req.params.tripId;
  const action = String(req.body.action || '');

  try {
    await Registration.coordinatorAction(
      Number(tripId),
      req.currentUser.id,
      action
    );

    // Registration action succeeded.
    return res.redirect(
      `/workspace/trips/${tripId}/registration?success=${encodeURIComponent(action)}`
    );

  } catch (error) {
    // Show expected validation errors on the same management page.
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.redirect(
        `/workspace/trips/${tripId}/registration?error=${encodeURIComponent(error.message)}`
      );
    }

    // Unexpected errors still go to Express error handling.
    return next(error);
  }
}

module.exports={joinPage,join,myTrips,withdraw,coordinatorPage,coordinatorAction};
