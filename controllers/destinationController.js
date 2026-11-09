const Destination = require('../models/Destination');
const {enrich}=require('../services/tripDiscovery');

function seasonNote(destination) {
  if (destination.slug === 'dangling-tsho') return 'Local restrictions, including Ladam, may affect access. The exact current dates could not be confirmed; check with local authorities before planning.';
  if (destination.slug === 'bumdeling') return 'Black-necked crane presence is seasonal, generally during the winter period. Sightings are not guaranteed; check local access and conditions.';
  if (destination.slug === 'merak-village' || destination.slug === 'sakteng-village') return 'Highland access depends on road, weather, and local requirements. Confirm the current route and visitor arrangements before travel.';
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
    const [photos,trips]=await Promise.all([Destination.getPhotos(destination.id),Destination.getPublicTrips(destination.id)]);
    res.render('destinations/detail',{title:destination.name,activeNav:'destinations',destination,photos,trips:trips.map(t=>enrich(t)),seasonWarning:seasonNote(destination)});
  }catch(error){next(error);}
}
module.exports={gallery,detail,seasonNote};
