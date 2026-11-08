const router=require('express').Router();
const {requireStudent,requireTripCoordinator}=require('../middleware/authorization');
const Finance=require('../controllers/financeController');
const {validId}=require('../models/Access');
router.get('/workspace/trips/:tripId/finance',requireStudent,(req,res,next)=>{
 if(!validId(req.params.tripId))return res.status(400).send('Invalid trip');
 Finance.page(req,res,next);
});
router.post('/workspace/trips/:tripId/finance/:kind',requireTripCoordinator,Finance.save);
router.post('/workspace/trips/:tripId/finance/:kind/:recordId',requireTripCoordinator,Finance.save);
module.exports=router;
