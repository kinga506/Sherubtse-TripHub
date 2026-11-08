const router=require('express').Router();
const {requireStudent,requireTripCoordinator}=require('../middleware/authorization');
const {validId}=require('../models/Access');
const Attendance=require('../controllers/attendanceController');
router.get('/workspace/trips/:tripId/attendance',requireStudent,(req,res,next)=>{
 if(!validId(req.params.tripId))return res.status(400).send('Invalid trip ID');
 Attendance.page(req,res,next);
});
router.post('/workspace/trips/:tripId/attendance/one',requireTripCoordinator,Attendance.update);
router.post('/workspace/trips/:tripId/attendance/all',requireTripCoordinator,(req,res,next)=>{req.params.mode='all';Attendance.update(req,res,next);});
router.get('/workspace/trips/:tripId/exports/:kind.csv',requireTripCoordinator,Attendance.download);
module.exports=router;
