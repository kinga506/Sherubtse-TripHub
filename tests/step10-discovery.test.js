jest.mock('../models/PublicTrip',()=>({list:jest.fn(),getById:jest.fn(),getCostItems:jest.fn()}));
const Trip=require('../models/PublicTrip');
const controller=require('../controllers/tripDiscoveryController');
const {registrationStatus}=require('../services/tripDiscovery');
const reply=()=>({render:jest.fn(),status:jest.fn().mockReturnThis()});
const now=new Date('2027-02-01T00:00:00Z');
const base={max_participants:10,occupied_seats:4,confirmed_participants:2,registration_open:true,vacancies_held_closed:false,registration_deadline:'2027-03-01T00:00:00Z'};
beforeEach(()=>jest.clearAllMocks());
test('pending and approved requests occupy seats separately from confirmed count',()=>{
 expect(registrationStatus(base,now)).toMatchObject({key:'open',available:6});
 expect(registrationStatus({...base,occupied_seats:10,confirmed_participants:8},now)).toMatchObject({key:'slots-full',available:0});
 expect(registrationStatus({...base,occupied_seats:10,confirmed_participants:10},now)).toMatchObject({key:'fully-booked',available:0});
});
test('closed, unopened, deadline and manual-reopen states are distinguished',()=>{
 expect(registrationStatus({...base,registration_open:false},now).key).toBe('not-open');
 expect(registrationStatus({...base,vacancies_held_closed:true},now).key).toBe('closed');
 expect(registrationStatus({...base,registration_deadline:'2027-01-01'},now).key).toBe('closed');
});
test('College Trips gallery ignores former search/filter parameters',async()=>{
 Trip.list.mockResolvedValue([{...base,id:1,title:'Merak',public_stage:'upcoming'}]);
 const res=reply();await controller.gallery({query:{q:'merak'}},res,jest.fn());
 expect(Trip.list).toHaveBeenCalledWith();
 expect(res.render).toHaveBeenCalledWith('trips/index',expect.objectContaining({title:'College Trips',trips:[expect.objectContaining({registration:expect.any(Object),public_stage:'upcoming'})]}));
});
test('College Trips view has no search, filters, sorting controls, or comparison table',()=>{
 const view=require('fs').readFileSync(require.resolve('../views/trips/index.ejs'),'utf8');
 expect(view).toContain('<h1>College Trips</h1>');
 expect(view).toContain('No college trips available');
 expect(view).not.toMatch(/type=["']search/i);
 expect(view).not.toMatch(/<form\b/i);
 expect(view).not.toMatch(/<table\b/i);
 expect(view).not.toMatch(/sort by|filter by|compare trips/i);
});
test('detail rejects bad identifiers before querying and missing public trips return 404',async()=>{
 const res=reply();await controller.detail({params:{id:'../1'}},res,jest.fn());expect(Trip.getById).not.toHaveBeenCalled();
 expect(res.status).toHaveBeenCalledWith(404);
 Trip.getById.mockResolvedValue(null);const res2=reply();await controller.detail({params:{id:'123'}},res2,jest.fn());
 expect(res2.status).toHaveBeenCalledWith(404);expect(Trip.getCostItems).not.toHaveBeenCalled();
});
test('public SQL enforces approval, active lead, non-sample, visibility and Bhutan end date',()=>{
 const source=require('fs').readFileSync(require.resolve('../models/PublicTrip'),'utf8');
 expect(source).toContain("t.approval_status='approved'");expect(source).toContain("c.assignment_role='lead'");
 expect(source).toContain('t.is_active=TRUE');expect(source).toContain('t.is_sample=FALSE');
 expect(source).toContain('t.is_publicly_hidden=FALSE');expect(source).toContain("AT TIME ZONE 'Asia/Thimphu'");
 expect(source).toContain("t.operational_status IN ('planned','ongoing')");
});
