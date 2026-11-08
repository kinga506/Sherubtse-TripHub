const router=require('express').Router();
const {requireStudent}=require('../middleware/authorization');
const Feedback=require('../controllers/feedbackController');
// User identity is taken from the authenticated session, never from form inputs.
function requireFeedbackStore(req,res,next){
 if(req.app.locals.enableMongo===false)return res.status(503).send('Trip feedback is temporarily unavailable');
 next();
}
router.get('/workspace/trips/:tripId/feedback',requireStudent,requireFeedbackStore,Feedback.studentPage);
router.post('/workspace/trips/:tripId/feedback',requireStudent,requireFeedbackStore,Feedback.submit);
router.get('/workspace/trips/:tripId/feedback/summary',requireStudent,requireFeedbackStore,Feedback.coordinatorPage);
module.exports=router;
