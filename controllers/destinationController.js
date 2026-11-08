const Destination = require('../models/Destination');
const {enrich}=require('../services/tripDiscovery');

function seasonNote(destination) {
  if (destination.slug === 'dangling-tsho') return 'Local tradition restricts visits during Ladam (approximately December–March). Confirm access before planning.';
  if (destination.slug === 'bumdeling') return 'Black-necked crane viewing is seasonal, mainly November–February. Do not disturb wildlife.';
  if (destination.slug === 'merak-village' || destination.slug === 'sakteng-village') return 'Highland access depends on road and weather conditions; confirm local requirements.';
  return null;
}
async function gallery(req,res,next) {
  try {
    const destinations = await Destination.getAll();
    res.render('destinations/index',{title:'Destinations',activeNav:'destinations',destinations});
  } catch(error){next(error);}
}
async function detail(req,res,next) {
  try {
    const {slug}=req.params;
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.status(404).render('not-found',{title:'Destination not found'});
    const destination=await Destination.getBySlug(slug);
    if(!destination) return res.status(404).render('not-found',{title:'Destination not found'});
    const [photos,trips]=await Promise.all([Destination.getPhotos(destination.id),Destination.getUpcomingTrips(destination.id)]);
    res.render('destinations/detail',{title:destination.name,activeNav:'destinations',destination,photos,trips:trips.map(t=>enrich(t)),seasonWarning:seasonNote(destination)});
  }catch(error){next(error);}
}
module.exports={gallery,detail,seasonNote};
