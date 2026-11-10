const mockDb={tx:jest.fn()};
jest.mock('../config/db',()=>({getDb:()=>mockDb}));
jest.mock('../models/User',()=>({findDsaInvitation:jest.fn(),verifyToken:jest.fn()}));
jest.mock('bcrypt',()=>({hash:jest.fn()}));

const crypto=require('node:crypto');
const User=require('../models/User');
const bcrypt=require('bcrypt');
const auth=require('../controllers/authController');
const raw='a'.repeat(64),tokenHash=crypto.createHash('sha256').update(raw).digest('hex');
const invite={id:88,name:'DSA Officer',email:'dsa@example.test'};
const response=()=>({status:jest.fn().mockReturnThis(),render:jest.fn().mockReturnThis(),redirect:jest.fn().mockReturnThis(),send:jest.fn().mockReturnThis()});
const tx={oneOrNone:jest.fn(),one:jest.fn(),none:jest.fn()};

beforeEach(()=>{jest.clearAllMocks();mockDb.tx.mockImplementation(fn=>fn(tx));bcrypt.hash.mockResolvedValue('bcrypt-hash');});

test('activation page safely renders invitation identity and form',async()=>{
 User.findDsaInvitation.mockResolvedValue(invite);const res=response();
 await auth.showDsaActivation({query:{token:raw}},res,jest.fn());
 expect(User.findDsaInvitation).toHaveBeenCalledWith(tokenHash);
 expect(res.render).toHaveBeenCalledWith('auth/dsa-activate',expect.objectContaining({invite,token:raw}));
});

test('invalid invitation shows resend guidance',async()=>{
 User.findDsaInvitation.mockResolvedValue(null);const res=response();
 await auth.showDsaActivation({query:{token:raw}},res,jest.fn());
 expect(res.status).toHaveBeenCalledWith(400);
 expect(res.render).toHaveBeenCalledWith('auth/dsa-activation-error',expect.any(Object));
});

test('password mismatch is rejected without attempting activation',async()=>{
 User.findDsaInvitation.mockResolvedValue(invite);const res=response();
 await auth.activateDsa({body:{token:raw,password:'long-enough-password',confirmPassword:'different-password'}},res,jest.fn());
 expect(res.status).toHaveBeenCalledWith(422);expect(mockDb.tx).not.toHaveBeenCalled();
});

test('successful activation locks and consumes the token in one transaction and audits without secrets',async()=>{
 tx.oneOrNone.mockResolvedValue(invite);tx.one.mockResolvedValue({id:invite.id});const res=response(),next=jest.fn();
 await auth.activateDsa({body:{token:raw,password:'long-enough-password',confirmPassword:'long-enough-password'}},res,next);
 expect(bcrypt.hash).toHaveBeenCalledWith('long-enough-password',12);
 expect(tx.oneOrNone).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'),[tokenHash]);
 expect(tx.one).toHaveBeenCalledWith(expect.stringContaining('password_hash=$1'),['bcrypt-hash',invite.id]);
 expect(tx.none).toHaveBeenCalledWith(expect.stringContaining('dsa_invitation_activated'),[invite.id]);
 expect(res.render).toHaveBeenCalledWith('auth/dsa-activation-success',{title:'DSA account activated'});expect(next).not.toHaveBeenCalled();
});

test.each([null])('expired, used, or concurrently consumed token cannot activate',async row=>{
 tx.oneOrNone.mockResolvedValue(row);const res=response();
 await auth.activateDsa({body:{token:raw,password:'long-enough-password',confirmPassword:'long-enough-password'}},res,jest.fn());
 expect(tx.one).not.toHaveBeenCalled();expect(tx.none).not.toHaveBeenCalled();
 expect(res.render).toHaveBeenCalledWith('auth/dsa-activation-error',expect.any(Object));
});

test('legacy generic verification links send DSA invitations to dedicated activation',async()=>{
 User.findDsaInvitation.mockResolvedValue(invite);const res=response();
 await auth.verify({query:{token:raw}},res,jest.fn());
 expect(res.redirect).toHaveBeenCalledWith(`/auth/activate-dsa?token=${raw}`);
 expect(User.verifyToken).not.toHaveBeenCalled();
});

test('student verification still uses the student verification flow',async()=>{
 User.findDsaInvitation.mockResolvedValue(null);User.verifyToken.mockResolvedValue({id:10});const res=response();
 await auth.verify({query:{token:raw}},res,jest.fn());
 expect(User.verifyToken).toHaveBeenCalledWith(tokenHash);
 expect(res.render).toHaveBeenCalledWith('auth/message',expect.objectContaining({title:'Email verified'}));
});
