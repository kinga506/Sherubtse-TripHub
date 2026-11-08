jest.mock('../config/db',()=>({getDb:jest.fn()}));
const {getDb}=require('../config/db');
const R=require('../models/Registration');
const {registrationStatus}=require('../services/tripDiscovery');
const futureTrip={id:11,title:'Test Trip',start_date:'2099-08-01',registration_deadline:'2099-07-01T08:00:00Z',max_participants:2,registration_open:true,vacancies_held_closed:false,approval_status:'approved',is_active:true,operational_status:'planned',estimated_cost:'100',is_sample:true};
const document={name:'consent.pdf',mime:'application/pdf',size:220};
function dbWithTask(task){getDb.mockReturnValue({tx:async fn=>fn(task)});}
beforeEach(()=>jest.clearAllMocks());
test('eligibility enforces approval, deadline and trip start date',()=>{
 expect(()=>R.eligible(futureTrip,new Date('2099-06-01'))).not.toThrow();
 expect(()=>R.eligible({...futureTrip,approval_status:'pending_dsa'},new Date('2099-06-01'))).toThrow();
 expect(()=>R.eligible({...futureTrip,registration_deadline:'2000-01-01'},new Date('2099-06-01'))).toThrow();
});
test('missing consent prevents a reserved slot',async()=>{
 await expect(R.join(11,4,'Joining',null,null)).rejects.toThrow(/consent/i);
 expect(getDb).not.toHaveBeenCalled();
});
test('full capacity blocks request inside trip lock before participant creation',async()=>{
 const task={oneOrNone:jest.fn(async sql=>sql.includes('FROM trips')?futureTrip:{id:88}),one:jest.fn(async()=>({occupied:2,confirmed:1})),none:jest.fn()};dbWithTask(task);
 await expect(R.join(11,4,'I would like to join',document,'a'.repeat(32))).rejects.toThrow('Slots Full');
 expect(task.oneOrNone.mock.calls[0][0]).toContain('FOR UPDATE');
 expect(task.none).not.toHaveBeenCalled();
});
test('valid pending join holds a place and stores a private unverified consent version',async()=>{
 const task={oneOrNone:jest.fn(async sql=>sql.includes('FROM trips')?futureTrip:sql.includes('trip_coordinators')?{id:1}:null),one:jest.fn(async sql=>sql.includes('COUNT(*)')?{occupied:0,confirmed:0}:sql.includes('INSERT INTO participants')?{id:80}:{v:1}),none:jest.fn(async()=>{})};dbWithTask(task);
 await expect(R.join(11,4,'Joining for learning',document,'a'.repeat(32))).resolves.toBe(80);
 const consentSql=task.none.mock.calls.find(call=>call[0].includes('INSERT INTO participant_consent_documents'));
 expect(consentSql).toBeDefined();expect(consentSql[0]).not.toContain('verified');
});
test('withdrawal holds vacancy closed so the roster trigger invalidates prior DSA clearance',async()=>{
 const task={oneOrNone:jest.fn(async sql=>sql.includes('FROM trips')?futureTrip:{id:80,status:'approved'}),any:jest.fn(async()=>[{id:22}]),none:jest.fn(async()=>{})};dbWithTask(task);
 await R.withdraw(11,4,'Cannot attend');
 expect(task.none.mock.calls.some(call=>call[0].includes('vacancies_held_closed=TRUE'))).toBe(true);
 expect(task.none.mock.calls.some(call=>call[0].includes("status='withdrawn'"))).toBe(true);
});
test('manual reopening required after a vacancy is held, even with places free',()=>{
 expect(registrationStatus({...futureTrip,occupied_seats:1,confirmed_participants:1,vacancies_held_closed:true},new Date('2099-06-01')).key).toBe('closed');
});
