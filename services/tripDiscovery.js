function registrationStatus(trip, now=new Date()) {
 const occupied=Number(trip.occupied_seats)||0;
 const confirmed=Number(trip.confirmed_participants)||0;
 const limit=Number(trip.max_participants)||0;
 const available=Math.max(0,limit-occupied);
 if(occupied>=limit && limit>0) return {key:confirmed===occupied?'fully-booked':'slots-full',label:confirmed===occupied?'Fully Booked':'Slots Full',available};
 if(trip.vacancies_held_closed) return {key:'closed',label:'Registration closed — awaiting manual reopening',available};
 if(!trip.registration_open) return {key:'not-open',label:'Registration closed',available};
 if(new Date(trip.registration_deadline).getTime()<now.getTime()) return {key:'closed',label:'Registration deadline passed',available};
 return {key:'open',label:'Registration open',available};
}
function enrich(trip,now=new Date()){
 return {...trip,registration:registrationStatus(trip,now),occupied_seats:Number(trip.occupied_seats)||0,
   confirmed_participants:Number(trip.confirmed_participants)||0};
}
module.exports={registrationStatus,enrich};
