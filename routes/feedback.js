const router=require('express').Router();
const {requireStudent}=require('../middleware/authorization');
const Feedback=require('../controllers/feedbackController');
// User identity is taken from the authenticated session, never from form inputs.
router.get('/workspace/trips/:tripId/feedback',requireStudent,Feedback.studentPage);
router.post('/workspace/trips/:tripId/feedback',requireStudent,Feedback.submit);
router.get('/workspace/trips/:tripId/feedback/summary',requireStudent,Feedback.coordinatorPage);
module.exports=router;
