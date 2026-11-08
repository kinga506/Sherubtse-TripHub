const Attendance=require('../models/Attendance');
async function page(req,res,next){try{
 const data=await Attendance.overview(Number(req.params.tripId),req.currentUser.id,req.query.date);
 res.set('Cache-Control','private, no-store');
 res.render('trips/attendance',{title:'Trip attendance',...data,saved:Boolean(req.query.saved)});
}catch(error){if(error.status&&error.status<500)return res.status(error.status).send(error.message);next(error);}}
async function update(req,res,next){try{
 const tripId=Number(req.params.tripId);
 if(req.params.mode==='all')await Attendance.markAllPresent(tripId,req.currentUser.id,req.body);
 else await Attendance.saveOne(tripId,req.currentUser.id,req.body);
 res.redirect(`/workspace/trips/${tripId}/attendance?date=${encodeURIComponent(req.body.attendance_date)}&saved=1`);
}catch(error){if(error.status&&error.status<500)return res.status(error.status).send(error.message);next(error);}}
async function download(req,res,next){try{
 const tripId=Number(req.params.tripId),kind=req.params.kind;
 const rows=await Attendance.exportRows(tripId,req.currentUser.id,kind);
 const body=Attendance.csv(kind,rows);
 res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="triphub-trip-${tripId}-${kind}.csv"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
 res.send(body);
}catch(error){if(error.status&&error.status<500)return res.status(error.status).send(error.message);next(error);}}
module.exports={page,update,download};
