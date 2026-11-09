const guard=require('../middleware/authorization');
const Access=require('../models/Access');
jest.mock('../models/Access');
const student={id:10,role:'student',is_verified:true,is_active:true};
const dsa={id:20,role:'dsa'};
const admin={id:30,role:'admin'};
const trip={id:5,proposed_by_user_id:10,is_active:true,approval_status:'approved',operational_status:'planned'};
const req=(user=student,id='5')=>({currentUser:user,params:{tripId:id},originalUrl:'/workspace/trips/5/coordinator'});
const res=()=>({status:jest.fn().mockReturnThis(),send:jest.fn(),redirect:jest.fn()});
async function run(middleware,request){const response=res();const next=jest.fn();await middleware(request,response,next);return {response,next};}
beforeEach(()=>{
 jest.resetAllMocks();Access.validId.mockImplementation(v=>/^[1-9][0-9]*$/.test(String(v)));
 Access.tripById.mockResolvedValue(trip);
 Access.activeAssignment.mockResolvedValue({assignment_role:'assistant'});
 Access.historicalAssignment.mockResolvedValue({assignment_role:'lead'});
 Access.approvedParticipation.mockResolvedValue({id:7});
  Access.participationRecord.mockResolvedValue({id:7,status:'approved'});
});
test.each([['student',guard.requireStudent,student],['dsa',guard.requireDsa,dsa],['superadmin',guard.requireSuperadmin,admin]])('%s role grants only matching users',async(_,middleware,user)=>{
 expect((await run(middleware,req(user))).next).toHaveBeenCalled();
 const {response}=await run(middleware,req(user===student?dsa:student));expect(response.status).toHaveBeenCalledWith(403);
});
test('anonymous page redirects; anonymous API returns 401',async()=>{
 const page=await run(guard.requireAuth,req(null));expect(page.response.redirect).toHaveBeenCalledWith('/auth/login');
 const request=req(null);request.originalUrl='/api/trips/5/coordinator';
 expect((await run(guard.requireAuth,request)).response.status).toHaveBeenCalledWith(401);
});
test('student may coordinate only with an active assignment',async()=>{
 expect((await run(guard.requireTripCoordinator,req())).next).toHaveBeenCalled();
 expect(Access.activeAssignment).toHaveBeenCalledWith(5,10);
 Access.activeAssignment.mockResolvedValue(null);
 expect((await run(guard.requireTripCoordinator,req())).response.status).toHaveBeenCalledWith(403);
});
test('lead-only access rejects assistants',async()=>{
 expect((await run(guard.requireLeadTripCoordinator,req())).response.status).toHaveBeenCalledWith(403);
 Access.activeAssignment.mockResolvedValue({assignment_role:'lead'});
 expect((await run(guard.requireLeadTripCoordinator,req())).next).toHaveBeenCalled();
});
test('no permanent coordinator role or DSA coordinator bypass',async()=>{
 expect((await run(guard.requireTripCoordinator,req(dsa))).response.status).toHaveBeenCalledWith(403);
 expect(Access.activeAssignment).not.toHaveBeenCalled();
});
test('invalid ID, nonexistent trip and database failures fail closed',async()=>{
 expect((await run(guard.requireTripCoordinator,req(student,'wrong'))).response.status).toHaveBeenCalledWith(400);
 Access.tripById.mockResolvedValueOnce(null);
 expect((await run(guard.requireTripCoordinator,req())).response.status).toHaveBeenCalledWith(404);
 Access.tripById.mockRejectedValueOnce(Error('DB down'));
 expect((await run(guard.requireTripCoordinator,req())).next).toHaveBeenCalledWith(expect.any(Error));
});
test('ended or unapproved trips block coordinator writing',async()=>{
 for(const change of [{operational_status:'completed'},{operational_status:'cancelled'},{approval_status:'pending_dsa'},{is_active:false}]){
  Access.tripById.mockResolvedValueOnce({...trip,...change});
  expect((await run(guard.requireTripCoordinator,req())).response.status).toHaveBeenCalledWith(403);
 }
});
test('proposal owner may edit own draft or changes-requested only',async()=>{
 Access.tripById.mockResolvedValueOnce({...trip,approval_status:'draft'});
 expect((await run(guard.requireProposalOwner,req())).next).toHaveBeenCalled();
 expect((await run(guard.requireProposalOwner,req())).response.status).toHaveBeenCalledWith(403);
 Access.tripById.mockResolvedValueOnce({...trip,approval_status:'changes_requested',proposed_by_user_id:11});
 expect((await run(guard.requireProposalOwner,req())).response.status).toHaveBeenCalledWith(403);
});
test('approved participant check never trusts submitted user id',async()=>{
 const request=req();request.query={userId:55};
 expect((await run(guard.requireApprovedParticipant,request)).next).toHaveBeenCalled();
 expect(Access.approvedParticipation).toHaveBeenCalledWith(5,10);
 Access.approvedParticipation.mockResolvedValue(null);
 expect((await run(guard.requireApprovedParticipant,req())).response.status).toHaveBeenCalledWith(403);
});
test('private trip view is available only to a student with their own request',async()=>{
 const request=req();request.body={userId:55};
 expect((await run(guard.requireTripParticipant,request)).next).toHaveBeenCalled();
 expect(Access.participationRecord).toHaveBeenCalledWith(5,10);
 Access.participationRecord.mockResolvedValueOnce(null);
 expect((await run(guard.requireTripParticipant,req())).response.status).toHaveBeenCalledWith(403);
});
test('historical access requires prior assignment, or institutional oversight',async()=>{
 Access.tripById.mockResolvedValue({...trip,operational_status:'completed'});
 expect((await run(guard.requireHistoricalTripAccess,req())).next).toHaveBeenCalled();
 Access.historicalAssignment.mockResolvedValue(null);
 expect((await run(guard.requireHistoricalTripAccess,req())).response.status).toHaveBeenCalledWith(403);
 expect((await run(guard.requireHistoricalTripAccess,req(dsa))).next).toHaveBeenCalled();
 expect((await run(guard.requireHistoricalTripAccess,req(admin))).next).toHaveBeenCalled();
});
