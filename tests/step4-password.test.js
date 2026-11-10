const mockDb={none:jest.fn()};
jest.mock('../config/db',()=>({getDb:()=>mockDb}));
const bcrypt=require('bcrypt');
const crypto=require('node:crypto');
const User=require('../models/User');
const PasswordReset=require('../models/PasswordReset');
const password=require('../controllers/passwordController');
const {sendEmail}=require('../services/mailer');

jest.mock('../models/User');
jest.mock('../models/PasswordReset');
jest.mock('../services/mailer',()=>({sendEmail:jest.fn()}));
const res=()=>({status:jest.fn().mockReturnThis(),render:jest.fn().mockReturnThis(),set:jest.fn().mockReturnThis(),clearCookie:jest.fn().mockReturnThis(),redirect:jest.fn().mockReturnThis()});
const next=jest.fn();
const student={id:10,email:'07270030.sherubtse@rub.edu.bt',role:'student',is_active:true,is_verified:true};
const getMessage=r=>r.render.mock.calls[0][1];
const resetToken='a'.repeat(64);
const digest=crypto.createHash('sha256').update(resetToken).digest('hex');

describe('Step 4 password recovery',()=>{
  beforeEach(()=>{jest.resetAllMocks();mockDb.none.mockResolvedValue();process.env.APP_URL='http://localhost:3000';process.env.NODE_ENV='test';});
  test('password policy applies consistently (12–72 characters)',()=>{
    expect(password.validPassword('x'.repeat(11))).toBe(false);
    expect(password.validPassword('x'.repeat(12))).toBe(true);
    expect(password.validPassword('x'.repeat(73))).toBe(false);
  });
  test.each(['student','dsa','admin'])('eligible %s account receives a single-use reset link',async role=>{
    User.findByEmail.mockResolvedValue({...student,role});
    PasswordReset.issueToken.mockResolvedValue({id:10});sendEmail.mockResolvedValue({});
    const r=res();await password.forgot({body:{email:student.email}},r,next);
    expect(PasswordReset.issueToken).toHaveBeenCalledWith(10,expect.stringMatching(/^[a-f0-9]{64}$/),expect.any(Date));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({to:student.email,subject:expect.stringMatching(/Reset/)}));
    if(role==='admin')expect(mockDb.none).toHaveBeenCalledWith(expect.stringContaining('admin_password_reset_initiated'),[10]);
    expect(getMessage(r).message).toBe(password.GENERIC_MESSAGE);
  });
  test('unknown, inactive and unverified accounts receive identical confirmation',async()=>{
    for(const user of [null,{...student,is_active:false},{...student,is_verified:false}]){
      jest.clearAllMocks();User.findByEmail.mockResolvedValue(user);
      const r=res();await password.forgot({body:{email:student.email}},r,next);
      expect(sendEmail).not.toHaveBeenCalled();expect(getMessage(r).message).toBe(password.GENERIC_MESSAGE);
    }
  });
  test('email delivery failure does not enumerate accounts',async()=>{
    User.findByEmail.mockResolvedValue(student);PasswordReset.issueToken.mockResolvedValue({id:10});
    sendEmail.mockRejectedValue(new Error('email provider unavailable'));
    const spy=jest.spyOn(console,'error').mockImplementation(()=>{});
    const r=res();await password.forgot({body:{email:student.email}},r,next);
    expect(getMessage(r).message).toBe(password.GENERIC_MESSAGE);spy.mockRestore();
  });
  test('malformed, expired or consumed link rejected',async()=>{
    for(const token of ['nope',resetToken]){
      PasswordReset.findValidToken.mockResolvedValue(null);
      const r=res();await password.showReset({query:{token}},r,next);
      expect(r.status).toHaveBeenCalledWith(400);
      expect(r.render).toHaveBeenCalledWith('auth/reset-invalid',expect.any(Object));
    }
  });
  test('reset rejects mismatched passwords without updating password',async()=>{
    PasswordReset.findValidToken.mockResolvedValue({id:10});
    const r=res();await password.reset({body:{token:resetToken,newPassword:'new-password-123',confirmPassword:'mismatch'}},r,next);
    expect(r.status).toHaveBeenCalledWith(400);expect(PasswordReset.consumeTokenAndChangePassword).not.toHaveBeenCalled();
  });
  test('successful reset hashes password, consumes exact hash and signs out',async()=>{
    PasswordReset.findValidToken.mockResolvedValue({id:10});PasswordReset.consumeTokenAndChangePassword.mockResolvedValue(true);
    const r=res();const req={body:{token:resetToken,newPassword:'new-password-123',confirmPassword:'new-password-123'},session:{destroy:cb=>cb(null)}};
    await password.reset(req,r,next);
    const [receivedHash,receivedPasswordHash]=PasswordReset.consumeTokenAndChangePassword.mock.calls[0];
    expect(receivedHash).toBe(digest);expect(await bcrypt.compare('new-password-123',receivedPasswordHash)).toBe(true);
    expect(r.clearCookie).toHaveBeenCalledWith('triphub.sid');
  });
  test('a reused link fails at atomic consumption',async()=>{
    PasswordReset.findValidToken.mockResolvedValue({id:10});PasswordReset.consumeTokenAndChangePassword.mockResolvedValue(false);
    const r=res();await password.reset({body:{token:resetToken,newPassword:'new-password-123',confirmPassword:'new-password-123'}},r,next);
    expect(r.status).toHaveBeenCalledWith(400);
  });
  test('change password checks current password and rejects reuse',async()=>{
    const currentHash=await bcrypt.hash('old-password-123',4);
    User.findById.mockResolvedValue({...student,password_hash:currentHash});
    const req={currentUser:student,body:{currentPassword:'wrong',newPassword:'new-password-123',confirmPassword:'new-password-123'}};
    const r=res();await password.change(req,r,next);expect(r.status).toHaveBeenCalledWith(400);
    req.body.currentPassword='old-password-123';req.body.newPassword='old-password-123';req.body.confirmPassword='old-password-123';
    const r2=res();await password.change(req,r2,next);expect(r2.status).toHaveBeenCalledWith(400);
    expect(PasswordReset.changePassword).not.toHaveBeenCalled();
  });
  test('successful change signs out and leaves roles unchanged',async()=>{
    const oldHash=await bcrypt.hash('old-password-123',4);
    User.findById.mockResolvedValue({...student,password_hash:oldHash});PasswordReset.changePassword.mockResolvedValue(true);
    const r=res();const req={currentUser:student,session:{destroy:cb=>cb(null)},body:{currentPassword:'old-password-123',newPassword:'new-password-123',confirmPassword:'new-password-123'}};
    await password.change(req,r,next);
    expect(PasswordReset.changePassword).toHaveBeenCalledWith(10,oldHash,expect.any(String));
    expect(r.redirect).toHaveBeenCalledWith('/auth/login?password=changed');
  });
});
