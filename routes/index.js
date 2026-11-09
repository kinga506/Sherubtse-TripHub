const router = require('express').Router();
const Destination=require('../models/Destination');
const PublicTrip=require('../models/PublicTrip');
const {enrich}=require('../services/tripDiscovery');
router.get('/',async(req,res,next)=>{
  try{
    const [destinations,trips]=await Promise.all([Destination.getAll(),PublicTrip.list(3)]);
    return res.render('index',{title:'Sherubtse TripHub',activeNav:'home',
      destinations:destinations.slice(0,3),trips:trips.map(trip=>enrich(trip))});
  }catch(error){return next(error);}
});
router.get('/about', (req, res) => res.render('about', { title: 'About Sherubtse TripHub', activeNav:'about' }));
router.use('/destinations', require('./destinations'));
router.use('/trips', require('./trips'));
router.get('/design-system', (req, res) => res.render('design-system', { title: 'Interface guide' }));
router.get('/health', (req, res) => res.json({ status: 'ok', app: 'Sherubtse TripHub' }));
module.exports = router;
