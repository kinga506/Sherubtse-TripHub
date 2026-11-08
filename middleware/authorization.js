const Access = require('../models/Access');

function deny(res,status,message) {return res.status(status).send(message);}
function requireAuth(req,res,next) {
  if (!req.currentUser) {
    if (req.originalUrl.startsWith('/api/')) return deny(res,401,'Authentication required');
    return res.redirect('/auth/login');
  }
  next();
}
function roleOnly(role) {
  return (req,res,next) => {
    if(!req.currentUser) return requireAuth(req,res,next);
    if(req.currentUser.role!==role) return deny(res,403,'Access denied');
    next();
  };
}
const requireStudent=roleOnly('student');
const requireDsa=roleOnly('dsa');
const requireSuperadmin=roleOnly('admin');

// Every trip-specific route must use :tripId and never trust a client-supplied user ID.
function withTrip(check) {
  return async (req,res,next) => {
    try {
      if(!req.currentUser) return requireAuth(req,res,next);
      if(!Access.validId(req.params.tripId)) return deny(res,400,'Invalid trip ID');
      const trip=await Access.tripById(Number(req.params.tripId));
      if(!trip) return deny(res,404,'Trip not found');
      const permission=await check(req.currentUser,trip,req);
      if(!permission) return deny(res,403,'Access denied');
      req.authorizedTrip=trip;
      req.tripPermission=permission;
      next();
    } catch(error) { next(error); }
  };
}
function canManage(trip) {return trip.is_active && trip.approval_status==='approved' && !['completed','cancelled'].includes(trip.operational_status);}
const requireTripCoordinator=withTrip(async(user,trip)=>{
  if(user.role!=='student'||!canManage(trip)) return false;
  return Access.activeAssignment(trip.id,user.id);
});
const requireLeadTripCoordinator=withTrip(async(user,trip)=>{
  if(user.role!=='student'||!canManage(trip)) return false;
  const assignment=await Access.activeAssignment(trip.id,user.id);
  return assignment?.assignment_role==='lead' ? assignment : false;
});
const requireProposalOwner=withTrip(async(user,trip)=>user.role==='student' && Number(trip.proposed_by_user_id)===Number(user.id) &&
  ['draft','changes_requested'].includes(trip.approval_status) ? {owner:true} : false);
const requireApprovedParticipant=withTrip(async(user,trip)=>{
  if(user.role!=='student'||!trip.is_active || trip.approval_status!=='approved') return false;
  return Access.approvedParticipation(trip.id,user.id);
});
const requireHistoricalTripAccess=withTrip(async(user,trip)=>{
  if(user.role==='dsa'||user.role==='admin') return {oversight:true};
  if(user.role!=='student'||!['completed','cancelled','awaiting_final_report'].includes(trip.operational_status)) return false;
  return Access.historicalAssignment(trip.id,user.id);
});
module.exports={requireAuth,requireStudent,requireDsa,requireSuperadmin,requireTripCoordinator,
  requireLeadTripCoordinator,requireProposalOwner,requireApprovedParticipant,requireHistoricalTripAccess,withTrip};
