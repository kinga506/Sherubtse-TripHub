const router=require('express').Router();
const auth=require('../middleware/authorization');
const c=require('../controllers/tripUpdatesController');
router.get('/workspace/trips/:tripId/updates',auth.requireAuth,(req,res,next)=>{
 if(!/^\d+$/.test(req.params.tripId)||!Number.isSafeInteger(Number(req.params.tripId))||Number(req.params.tripId)<1)return res.status(400).send('Invalid trip');
 return c.page(req,res,next);
});
router.post('/workspace/trips/:tripId/updates/activities',auth.requireTripCoordinator,c.saveActivity);
router.post('/workspace/trips/:tripId/updates/activities/:activityId',auth.requireTripCoordinator,c.saveActivity);
router.post('/workspace/trips/:tripId/updates/activities/:activityId/delete',auth.requireTripCoordinator,c.removeActivity);
router.post('/workspace/trips/:tripId/updates/announcements',auth.requireTripCoordinator,c.createAnnouncement);
module.exports=router;
