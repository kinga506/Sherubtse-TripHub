const mockDb={any:jest.fn(),oneOrNone:jest.fn(),tx:jest.fn()};
jest.mock('../config/db',()=>({getDb:()=>mockDb}));
const PublicTrip=require('../models/PublicTrip');

const base={approval_status:'approved',is_active:true,is_sample:false,operational_status:'planned',
 is_publicly_hidden:false,start_date:'2027-03-12',end_date:'2027-03-14',has_active_lead:true};

beforeEach(()=>jest.clearAllMocks());

test('visibility uses Bhutan calendar days and keeps a trip public through its end date',()=>{
 expect(PublicTrip.bhutanDate(new Date('2027-03-11T17:59:59Z'))).toBe('2027-03-11');
 expect(PublicTrip.bhutanDate(new Date('2027-03-11T18:00:00Z'))).toBe('2027-03-12');
 expect(PublicTrip.isPublicEligible(base,'2027-03-14')).toBe(true);
 expect(PublicTrip.isPublicEligible(base,'2027-03-15')).toBe(false);
});

test('labels a trip Upcoming before start and Ongoing from start through end',()=>{
 expect(PublicTrip.visibilityInfo(base,'2027-03-11')).toMatchObject({public_visibility_state:'public',public_stage:'upcoming',public_visibility_label:'Public — Upcoming'});
 expect(PublicTrip.visibilityInfo(base,'2027-03-12')).toMatchObject({public_visibility_state:'public',public_stage:'ongoing',public_visibility_label:'Public — Ongoing'});
 expect(PublicTrip.visibilityInfo(base,'2027-03-14').public_visibility_state).toBe('public');
 expect(PublicTrip.visibilityInfo(base,'2027-03-15').public_visibility_state).toBe('not_eligible');
});

test.each([
 ['unapproved',{approval_status:'pending_dsa'}],
 ['inactive',{is_active:false}],
 ['sample',{is_sample:true}],
 ['cancelled',{operational_status:'cancelled'}],
 ['archived',{operational_status:'completed'}],
 ['awaiting final report',{operational_status:'awaiting_final_report'}],
 ['manually hidden',{is_publicly_hidden:true}],
 ['without active lead',{has_active_lead:false}]
])('excludes %s trips from public discovery',(_label,changes)=>{
 expect(PublicTrip.isPublicEligible({...base,...changes},'2027-03-13')).toBe(false);
});

test('listing and detail share the same public eligibility predicate',async()=>{
 mockDb.any.mockResolvedValue([]);mockDb.oneOrNone.mockResolvedValue(null);
 await PublicTrip.list();await PublicTrip.getById(44);
 expect(mockDb.any.mock.calls[0][0]).toContain(PublicTrip.PUBLIC_WHERE);
 expect(mockDb.oneOrNone.mock.calls[0][0]).toContain(PublicTrip.PUBLIC_WHERE);
 expect(mockDb.oneOrNone.mock.calls[0][1]).toEqual([44]);
});

function transaction(trip,assignment={id:2},lead={id:2}){
 const task={
  oneOrNone:jest.fn().mockResolvedValueOnce(trip).mockResolvedValueOnce(assignment).mockResolvedValueOnce(lead),
  none:jest.fn().mockResolvedValue(undefined)
 };
 mockDb.tx.mockImplementation(async callback=>callback(task));
 return task;
}

test('lead hide is audited and changes visibility only, leaving registration untouched',async()=>{
 const task=transaction({...base,registration_open:true});
 await expect(PublicTrip.setVisibility(4,8,true,'Safety planning')).resolves.toMatchObject({hidden:true,changed:true});
 expect(task.oneOrNone.mock.calls[0][0]).toContain('FOR UPDATE');
 expect(task.oneOrNone.mock.calls[1][0]).toContain("assignment_role='lead'");
 expect(task.none).toHaveBeenCalledTimes(2);
 expect(task.none.mock.calls[0][0]).toContain('is_publicly_hidden=$1');
 expect(task.none.mock.calls[0][0]).not.toContain('registration_open');
 expect(task.none.mock.calls[0][1]).toEqual([true,4]);
 expect(task.none.mock.calls[1][0]).toContain('INSERT INTO trip_public_visibility_events');
 expect(task.none.mock.calls[1][1]).toEqual([4,8,'hide','Safety planning']);
});

test('assistant or other user cannot change visibility',async()=>{
 const task=transaction(base,null,{id:2});
 await expect(PublicTrip.setVisibility(4,99,true)).rejects.toMatchObject({status:403});
 expect(task.none).not.toHaveBeenCalled();
});

test('restore revalidates eligibility and refuses ended trips',async()=>{
 const trip={...base,is_publicly_hidden:true,end_date:'2001-03-12'};
 const task=transaction(trip);
 await expect(PublicTrip.setVisibility(4,8,false)).rejects.toMatchObject({status:409});
 expect(task.none).not.toHaveBeenCalled();
});

test('visibility updates require the transaction-locked trip and lead assignment',async()=>{
 const source=require('fs').readFileSync(require.resolve('../models/PublicTrip'),'utf8');
 expect(source).toContain('SELECT * FROM trips WHERE id=$1 FOR UPDATE');
 expect(source).toContain("status='active' AND assignment_role='lead' FOR UPDATE");
 expect(source).toContain('UPDATE trips SET is_publicly_hidden=$1');
});

test('visibility route is lead-only and DSA page exposes audit history',()=>{
 const fs=require('fs');
 const routes=fs.readFileSync(require.resolve('../routes/workspaces'),'utf8');
 const coordinatorView=fs.readFileSync(require.resolve('../views/coordinators/list.ejs'),'utf8');
 const dsaView=fs.readFileSync(require.resolve('../views/dsa/trip-lifecycle.ejs'),'utf8');
 expect(routes).toContain("auth.requireLeadTripCoordinator,visibility.change");
 expect(coordinatorView).toContain("trip.assignment_role==='lead' && trip.public_eligible");
 expect(dsaView).toContain('Visibility history');
 expect(dsaView).toContain('latest.actor_name');
});
