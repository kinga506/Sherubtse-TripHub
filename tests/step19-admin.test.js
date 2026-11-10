const mockDb={any:jest.fn(),one:jest.fn(),oneOrNone:jest.fn(),result:jest.fn(),none:jest.fn(),tx:jest.fn()};
jest.mock('../config/db',()=>({getDb:()=>mockDb}));
const M=require('../models/SiteAdmin');
beforeEach(()=>jest.clearAllMocks());
test('rejects unknown admin sections instead of interpolating table names',async()=>{
 await expect(M.list('users;DROP TABLE users')).rejects.toMatchObject({status:404});
 expect(mockDb.any).not.toHaveBeenCalled();
});
test('rejects malformed record IDs',async()=>{
 await expect(M.update('faqs','3 OR 1=1',{},1)).rejects.toMatchObject({status:422});
 expect(mockDb.result).not.toHaveBeenCalled();
});
test('content update uses placeholders',async()=>{
 mockDb.result.mockResolvedValue({rowCount:1});
 await M.update('faqs',3,{question:'Can I join?',answer:'Ask the Coordinator.',sort_order:'2',is_active:'true'},99);
 expect(mockDb.result.mock.calls[0][0]).toContain('question=$1');
 expect(mockDb.result.mock.calls[0][1].at(-1)).toBe(3);
});
test('cannot deactivate own Superadmin account',async()=>{
 mockDb.tx.mockImplementation(async fn=>fn({one:async()=>({pg_advisory_xact_lock:null}),oneOrNone:async()=>({id:5,role:'admin',is_active:true})}));
 await expect(M.update('users','5',{is_active:'false'},5)).rejects.toThrow('own account');
});
test('cannot deactivate the last active Superadmin',async()=>{
 let oneCall=0;
 mockDb.tx.mockImplementation(async fn=>fn({one:async()=>++oneCall===1?{}:{count:0},oneOrNone:async()=>({id:7,role:'admin',is_active:true}),none:jest.fn()}));
 await expect(M.update('users','7',{is_active:'false'},99)).rejects.toThrow('last active Superadmin');
});
test('user listing uses bounded server-side pagination and parameterized filters',async()=>{
 mockDb.any.mockResolvedValue([]);mockDb.one.mockResolvedValue({total:0});
 const result=await M.list('users',{q:'name',role:'student',verified:'true',active:'false',page:'2'});
 expect(result.page).toBe(2);expect(result.pages).toBe(1);
 expect(mockDb.any.mock.calls[0][0]).toContain('LIMIT $5 OFFSET $6');
 expect(mockDb.any.mock.calls[0][1]).toEqual(['name','student',true,false,25,25]);
});
test('public help model explicitly selects only active FAQ and guideline rows',async()=>{
 mockDb.any.mockResolvedValue([]);await M.publicHelp();
 expect(mockDb.any.mock.calls[0][0]).toContain('WHERE is_active=true ORDER BY sort_order,id');
 expect(mockDb.any.mock.calls[1][0]).toContain('WHERE is_active=true ORDER BY sort_order,id');
});
