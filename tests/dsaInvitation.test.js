const mockDb={one:jest.fn(),oneOrNone:jest.fn(),none:jest.fn(),tx:jest.fn()};
jest.mock('../config/db',()=>({getDb:()=>mockDb}));
jest.mock('../models/SiteAdmin',()=>({audit:jest.fn()}));
jest.mock('../config/storage',()=>({getStorage:()=>({})}));
jest.mock('../services/mailer',()=>({sendEmail:jest.fn()}));
jest.mock('bcrypt',()=>({hash:jest.fn().mockResolvedValue('unusable-bcrypt-hash')}));
jest.mock('../middleware/security',()=>({authLimiter:(req,res,next)=>next()}));

const crypto=require('node:crypto');
const {sendEmail}=require('../services/mailer');
const bcrypt=require('bcrypt');
const controller=require('../controllers/siteAdminController');
const response=()=>({status:jest.fn().mockReturnThis(),send:jest.fn().mockReturnThis(),redirect:jest.fn().mockReturnThis()});

beforeEach(()=>{jest.clearAllMocks();mockDb.one.mockResolvedValue({id:91});mockDb.tx.mockImplementation(fn=>fn({one:mockDb.one,none:mockDb.none}));sendEmail.mockResolvedValue({accepted:true});process.env.APP_URL='http://localhost:3000';process.env.NODE_ENV='test';});

test('creates an invited DSA with hashed token and sends a dedicated activation link',async()=>{
 const res=response(),next=jest.fn();
 await controller.createDsa({body:{name:'New DSA',email:'NEW.DSA@example.test'},currentUser:{id:7}},res,next);
 const [sql,params]=mockDb.one.mock.calls[0];
 expect(sql).toContain("'dsa',false,true");expect(params[2]).toBe('unusable-bcrypt-hash');
 expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String),12);
 expect(params[3]).toMatch(/^[a-f0-9]{64}$/);
 const email=sendEmail.mock.calls[0][0];const raw=new URL(email.text.match(/http[^\s]+/)[0]).searchParams.get('token');
 expect(crypto.createHash('sha256').update(raw).digest('hex')).toBe(params[3]);
 expect(email.subject).toContain('DSA invitation');expect(email.text).toMatch(/create your password/i);
 expect(res.redirect).toHaveBeenCalledWith('/workspace/superadmin/manage/users?dsa=created');expect(next).not.toHaveBeenCalled();
});

test('database uniqueness conflict prevents duplicate DSA accounts',async()=>{
 mockDb.one.mockRejectedValue({code:'23505'});mockDb.tx.mockImplementation(fn=>fn({one:mockDb.one,none:mockDb.none}));const res=response();
 await controller.createDsa({body:{name:'Duplicate',email:'dsa@example.test'},currentUser:{id:7}},res,jest.fn());
 expect(res.status).toHaveBeenCalledWith(409);expect(sendEmail).not.toHaveBeenCalled();
});
