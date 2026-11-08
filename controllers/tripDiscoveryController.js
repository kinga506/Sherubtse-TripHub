const PublicTrip=require('../models/PublicTrip');
const {enrich}=require('../services/tripDiscovery');
async function gallery(req,res,next){
 try{
  const filters=PublicTrip.cleanFilters(req.query);
  const [rows,dzongkhags]=await Promise.all([PublicTrip.list(filters),PublicTrip.getDzongkhags()]);
  res.render('trips/index',{title:'Upcoming trips',activeNav:'trips',trips:rows.map(t=>enrich(t)),filters,dzongkhags});
 }catch(error){next(error);}
}
async function detail(req,res,next){
 try{
  if(!/^[1-9]\d{0,14}$/.test(req.params.id)) return res.status(404).render('not-found',{title:'Trip not found'});
  const row=await PublicTrip.getById(req.params.id);
  if(!row) return res.status(404).render('not-found',{title:'Trip not found'});
  const costItems=await PublicTrip.getCostItems(row.id);
  res.render('trips/detail',{title:row.title,activeNav:'trips',trip:enrich(row),costItems});
 }catch(error){next(error);}
}
module.exports={gallery,detail};
