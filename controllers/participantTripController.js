const {getDb}=require('../config/db');

async function page(req,res,next){
 try{
  const tripId=Number(req.params.tripId);
  const trip=await getDb().oneOrNone(`SELECT t.id,t.title,t.description,t.purpose,t.start_date,t.end_date,
    t.meeting_point,t.meeting_time,t.transport_information,t.safety_information,
    t.emergency_contact_name,t.emergency_contact_phone,t.registration_deadline,
    t.estimated_cost,t.estimated_budget_note,t.registration_open,
    d.name AS destination_name,d.slug AS destination_slug,
    p.status AS participation_status,p.reason AS participation_reason,p.decision_note,p.requested_at
    FROM trips t JOIN destinations d ON d.id=t.destination_id
    JOIN participants p ON p.trip_id=t.id AND p.user_id=$2
    WHERE t.id=$1`,[tripId,req.currentUser.id]);
  if(!trip)return res.status(404).render('not-found',{title:'Trip not found'});
  const itinerary=trip.participation_status==='approved'
   ?await getDb().any(`SELECT day_number,start_time,title,description FROM itineraries
     WHERE trip_id=$1 ORDER BY day_number,sort_order,id`,[tripId]):[];
  res.set('Cache-Control','private, no-store');
  return res.render('trips/participant',{title:trip.title,trip,itinerary});
 }catch(error){return next(error);}
}

module.exports={page};
