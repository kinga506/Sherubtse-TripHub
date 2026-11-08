jest.mock('../models/PublicTrip',()=>({cleanFilters:jest.fn(),list:jest.fn(),getDzongkhags:jest.fn(),getById:jest.fn(),getCostItems:jest.fn()}));
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
test('gallery passes normalized filters and displays only model-returned trips',async()=>{
 Trip.cleanFilters.mockReturnValue({q:'merak',dzongkhag:'',registration:'all',sort:'soonest'});
 Trip.list.mockResolvedValue([{...base,id:1,title:'Merak'}]);Trip.getDzongkhags.mockResolvedValue([]);
 const res=reply();await controller.gallery({query:{q:'merak'}},res,jest.fn());
 expect(Trip.list).toHaveBeenCalledWith(expect.objectContaining({q:'merak'}));
 expect(res.render).toHaveBeenCalledWith('trips/index',expect.objectContaining({trips:[expect.objectContaining({registration:expect.any(Object)})]}));
});
test('detail rejects bad identifiers before querying and missing public trips return 404',async()=>{
 const res=reply();await controller.detail({params:{id:'../1'}},res,jest.fn());expect(Trip.getById).not.toHaveBeenCalled();
 expect(res.status).toHaveBeenCalledWith(404);
 Trip.getById.mockResolvedValue(null);const res2=reply();await controller.detail({params:{id:'123'}},res2,jest.fn());
 expect(res2.status).toHaveBeenCalledWith(404);expect(Trip.getCostItems).not.toHaveBeenCalled();
});
test('public SQL enforces approved status and active lead assignment',()=>{
 const source=require('fs').readFileSync(require.resolve('../models/PublicTrip'),'utf8');
 expect(source).toContain("t.approval_status='approved'");expect(source).toContain("c.assignment_role='lead'");
 expect(source).toContain('t.is_active=TRUE');
});
