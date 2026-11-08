const router=require('express').Router();
const auth=require('../middleware/authorization');
const controller=require('../controllers/finalReportController');
router.get('/workspace/trips/:tripId/final-report',auth.requireAuth,controller.page);
router.post('/workspace/trips/:tripId/final-report',auth.requireLeadTripCoordinator,controller.submit);
router.get('/workspace/dsa/trip-lifecycle',auth.requireDsa,controller.dsaQueue);
router.post('/workspace/dsa/trips/:tripId/cancel',auth.requireDsa,controller.cancel);
module.exports=router;
