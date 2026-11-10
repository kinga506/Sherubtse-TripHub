const mockDb={one:jest.fn(),oneOrNone:jest.fn(),none:jest.fn(),tx:jest.fn()};
jest.mock('../config/db',()=>({getDb:()=>mockDb}));
jest.mock('../models/SiteAdmin',()=>({audit:jest.fn()}));
jest.mock('../config/storage',()=>({getStorage:()=>({})}));
jest.mock('../services/mailer',()=>({sendEmail:jest.fn()}));
jest.mock('bcrypt',()=>({hash:jest.fn(),compare:jest.fn()}));
jest.mock('../middleware/security',()=>({authLimiter:(req,res,next)=>next()}));

const crypto=require('node:crypto');
const bcrypt=require('bcrypt');
const {sendEmail}=require('../services/mailer');
const controller=require('../controllers/siteAdminController');

const current={id:42,email:'admin@college.example',password_hash:'stored-password-hash'};
const response=()=>({status:jest.fn().mockReturnThis(),send:jest.fn().mockReturnThis(),redirect:jest.fn().mockReturnThis(),render:jest.fn().mockReturnThis()});
const next=jest.fn();
function transaction(){mockDb.tx.mockImplementation(fn=>fn({one:mockDb.one,oneOrNone:mockDb.oneOrNone,none:mockDb.none}));}

describe('Superadmin verified email change',()=>{
 let oldAppUrl,oldNodeEnv;
 beforeEach(()=>{
  jest.clearAllMocks();
  oldAppUrl=process.env.APP_URL;oldNodeEnv=process.env.NODE_ENV;
  process.env.APP_URL='http://localhost:3000';process.env.NODE_ENV='test';
  bcrypt.compare.mockResolvedValue(true);sendEmail.mockResolvedValue({accepted:true});
  mockDb.one.mockResolvedValue(current);mockDb.oneOrNone.mockResolvedValue(null);mockDb.none.mockResolvedValue();
  transaction();
 });
 afterEach(()=>{if(oldAppUrl===undefined)delete process.env.APP_URL;else process.env.APP_URL=oldAppUrl;if(oldNodeEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldNodeEnv;});

 test('requires a current password before database changes',async()=>{
  const res=response();await controller.changeAdminEmail({body:{email:'new@college.example',currentPassword:''},currentUser:{id:42}},res,next);
  expect(res.status).toHaveBeenCalledWith(422);expect(bcrypt.compare).not.toHaveBeenCalled();expect(mockDb.tx).not.toHaveBeenCalled();expect(sendEmail).not.toHaveBeenCalled();
 });

 test('rejects an incorrect current password before reserving the address',async()=>{
  bcrypt.compare.mockResolvedValueOnce(false);
  const res=response();await controller.changeAdminEmail({body:{email:'new@college.example',currentPassword:'wrong-password'},currentUser:{id:42}},res,next);
  expect(res.status).toHaveBeenCalledWith(422);expect(mockDb.tx).not.toHaveBeenCalled();expect(sendEmail).not.toHaveBeenCalled();
 });

 test('verifies the current password and stores only a SHA-256 digest of a random one-time token',async()=>{
  mockDb.oneOrNone.mockResolvedValueOnce({id:42,email:current.email}).mockResolvedValueOnce(null);
  const res=response();await controller.changeAdminEmail({body:{email:' New@College.Example ',currentPassword:'correct-horse'},currentUser:{id:42}},res,next);
  expect(bcrypt.compare).toHaveBeenCalledWith('correct-horse',current.password_hash);
  const update=mockDb.none.mock.calls.find(([sql])=>sql.includes('UPDATE users SET pending_email'));
  expect(update[1][0]).toBe('new@college.example');expect(update[1][1]).toMatch(/^[a-f0-9]{64}$/);
  const raw=sendEmail.mock.calls[0][0].text.match(/token=([a-f0-9]{64})/)[1];
  expect(crypto.createHash('sha256').update(raw).digest('hex')).toBe(update[1][1]);
  expect(update[1][1]).not.toBe(raw);expect(res.redirect).toHaveBeenCalledWith('/account?emailChange=sent');
  expect(mockDb.none.mock.calls.some(([sql,values])=>sql.includes('admin_email_change_requested')&&values[0]===42)).toBe(true);
  expect(sendEmail.mock.calls[0][0].to).toBe('new@college.example');
 });

 test('rejects addresses already used or reserved by another account',async()=>{
  mockDb.oneOrNone.mockResolvedValueOnce({id:42,email:current.email}).mockResolvedValueOnce({id:99});
  const res=response();await controller.changeAdminEmail({body:{email:'taken@college.example',currentPassword:'correct-horse'},currentUser:{id:42}},res,next);
  expect(mockDb.oneOrNone.mock.calls[1][0]).toMatch(/LOWER\(email\).*LOWER\(pending_email\)/s);
  expect(res.status).toHaveBeenCalledWith(409);expect(sendEmail).not.toHaveBeenCalled();
 });

 test('database unique conflicts from concurrent requests return a safe conflict',async()=>{
  mockDb.tx.mockRejectedValueOnce(Object.assign(new Error('unique violation'),{code:'23505'}));
  const res=response();await controller.changeAdminEmail({body:{email:'new@college.example',currentPassword:'correct-horse'},currentUser:{id:42}},res,next);
  expect(res.status).toHaveBeenCalledWith(409);expect(res.send).toHaveBeenCalledWith('Email address is already in use or awaiting verification');
 });

 test('expired and malformed verification links cannot update the account',async()=>{
  const expired=response();mockDb.oneOrNone.mockResolvedValueOnce(null);
  await controller.verifyAdminEmail({query:{token:'a'.repeat(64)}},expired,next);
  expect(mockDb.oneOrNone.mock.calls[0][0]).toContain('pending_email_expires>NOW()');
  expect(expired.status).toHaveBeenCalledWith(400);expect(mockDb.one).not.toHaveBeenCalled();
  const malformed=response();await controller.verifyAdminEmail({query:{token:'plaintext-or-short'}},malformed,next);
  expect(malformed.status).toHaveBeenCalledWith(400);expect(mockDb.tx).toHaveBeenCalledTimes(1);
 });

 test('successful verification changes the email, clears pending fields, audits, and invalidates sessions atomically',async()=>{
  const raw='b'.repeat(64),digest=crypto.createHash('sha256').update(raw).digest('hex');
  mockDb.oneOrNone.mockResolvedValueOnce({id:42,email:current.email});
  mockDb.one.mockResolvedValueOnce({id:42,email:'new@college.example'});
  const res=response();await controller.verifyAdminEmail({query:{token:raw}},res,next);
  expect(mockDb.oneOrNone.mock.calls[0][1]).toEqual([digest]);
  expect(mockDb.one.mock.calls[0][0]).toMatch(/email=pending_email,is_verified=true,pending_email=NULL,pending_email_token=NULL,pending_email_expires=NULL/);
  expect(mockDb.none.mock.calls.some(([sql])=>sql.includes('admin_email_changed'))).toBe(true);
  expect(mockDb.none.mock.calls.some(([sql])=>sql.includes('DELETE FROM session'))).toBe(true);
  expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({to:current.email,subject:expect.stringContaining('email changed')}));
  expect(res.render).toHaveBeenCalledWith('auth/message',expect.objectContaining({title:'Email address updated'}));
 });

 test('a consumed token is single use',async()=>{
  mockDb.oneOrNone.mockResolvedValueOnce(null);
  const res=response();await controller.verifyAdminEmail({query:{token:'c'.repeat(64)}},res,next);
  expect(res.status).toHaveBeenCalledWith(400);expect(mockDb.one).not.toHaveBeenCalled();expect(sendEmail).not.toHaveBeenCalled();
 });

 test('migrations add compatible columns and enforce cross-account email reservations',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const step23=fs.readFileSync(path.join(__dirname,'../db/step23-superadmin-audit-migration.sql'),'utf8');
  const step24=fs.readFileSync(path.join(__dirname,'../db/step24-superadmin-email-change-migration.sql'),'utf8');
  const schema=fs.readFileSync(path.join(__dirname,'../db/schema.sql'),'utf8');
  expect(schema).toContain('CREATE TABLE IF NOT EXISTS users');expect(schema).toContain('CREATE TABLE IF NOT EXISTS admin_audit_logs');
  expect(step23).toContain('CREATE TABLE IF NOT EXISTS admin_audit_logs');
  expect(step24).toContain('ADD COLUMN IF NOT EXISTS pending_email TEXT');
  expect(step24).toContain('LOWER(pending_email)) WHERE pending_email IS NOT NULL');
  expect(step24).toContain('trg_users_unique_email_reservations');
  expect(step24).toContain('pg_advisory_xact_lock');
  expect(step23+step24).not.toMatch(/DROP\s+TABLE|DELETE\s+FROM\s+(users|admin_audit_logs)/i);
 });
});
