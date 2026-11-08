const router=require('express').Router();
const {requireStudent}=require('../middleware/authorization');
const {validId}=require('../models/Access');
const controller=require('../controllers/packingController');
router.use('/workspace/trips/:tripId/packing',(req,res,next)=>{
 if(!validId(req.params.tripId))return res.status(400).send('Invalid trip');next();
});
router.get('/workspace/trips/:tripId/packing',requireStudent,controller.page);
router.post('/workspace/trips/:tripId/packing/:action',requireStudent,controller.action);
router.post('/workspace/trips/:tripId/packing/suggestions/:action',requireStudent,controller.suggestion);
module.exports=router;
