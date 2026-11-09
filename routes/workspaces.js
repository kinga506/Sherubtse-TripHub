const router=require('express').Router();
const auth=require('../middleware/authorization');
const Access=require('../models/Access');
const reg=require('../controllers/registrationController');
const visibility=require('../controllers/publicVisibilityController');
const participantTrip=require('../controllers/participantTripController');

router.get('/coordinating-trips',auth.requireStudent,visibility.coordinating);
router.post('/trips/:tripId/public-visibility',auth.requireLeadTripCoordinator,visibility.change);
router.get('/my-trips',auth.requireStudent,reg.myTrips);
router.get('/trips/:tripId/registration',auth.requireTripCoordinator,reg.coordinatorPage);
router.post('/trips/:tripId/registration',auth.requireTripCoordinator,reg.coordinatorAction);
router.get('/student',auth.requireStudent,async(req,res,next)=>{
  try {const assigned=await Access.coordinatingTripIds(req.currentUser.id);
    res.render('workspace',{title:'Student dashboard',heading:'Student dashboard',detail:'Your Student account remains active when Coordinator assignments end.',assigned});
  } catch(error){next(error);}
});
router.get('/dsa',auth.requireDsa,(req,res)=>res.redirect('/workspace/dsa/proposals'));
router.get('/superadmin',auth.requireSuperadmin,(req,res)=>res.redirect('/workspace/superadmin/manage/users'));
router.get('/trips/:tripId/coordinator',auth.requireTripCoordinator,(req,res)=>res.render('workspace',{title:'Coordinator workspace',heading:'Trip Coordinator workspace',detail:'Restricted to your current assignment for this trip.',assigned:[]}));
router.get('/trips/:tripId/lead',auth.requireLeadTripCoordinator,(req,res)=>res.render('workspace',{title:'Lead Coordinator workspace',heading:'Lead Trip Coordinator',detail:'Only the active lead for this trip may access this page.',assigned:[]}));
router.get('/trips/:tripId/proposal/edit',auth.requireProposalOwner,(req,res)=>res.render('workspace',{title:'My proposal',heading:'My proposal',detail:'Only its submitter can edit a draft or changes-requested proposal.',assigned:[]}));
router.get('/trips/:tripId/participant',auth.requireTripParticipant,participantTrip.page);
router.get('/trips/:tripId/history',auth.requireHistoricalTripAccess,(req,res)=>res.render('workspace',{title:'Trip history',heading:'Read-only trip history',detail:'Historical records are read-only. No editing route is provided.',assigned:[]}));
// Proof that API paths use identical server-side checks (not merely hidden links).
router.get('/api/trips/:tripId/coordinator',auth.requireTripCoordinator,(req,res)=>res.json({tripId:req.authorizedTrip.id,permission:'coordinator'}));
router.get('/api/trips/:tripId/history',auth.requireHistoricalTripAccess,(req,res)=>res.json({tripId:req.authorizedTrip.id,readOnly:true}));
module.exports=router;
