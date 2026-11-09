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
 mockDb.tx.mockImplementation(async fn=>fn({oneOrNone:async()=>({id:5,role:'admin'})}));
 await expect(M.update('users','5',{is_active:'false'},5)).rejects.toThrow('own account');
});
