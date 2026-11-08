const request=require('supertest');
const crypto=require('node:crypto');
const User=require('../models/User');
const bcrypt=require('bcrypt');
const {validStudentEmail}=require('../controllers/authController');
const createApp=require('../app');
process.env.SESSION_SECRET ||= 'development_test_secret_32_chars_minimum';

jest.mock('../models/User');
jest.mock('../services/mailer',()=>({sendEmail:jest.fn().mockResolvedValue({mode:'log'})}));
const {sendEmail}=require('../services/mailer');
const app=createApp({nodeEnv:'test'});

describe('Step 3 security and authentication',()=>{
 beforeEach(()=>jest.clearAllMocks());
 test('accept only numeric-prefix institutional Student email',()=>{
   expect(validStudentEmail('07270030.sherubtse@rub.edu.bt')).toBe(true);
   for (const email of ['person@gmail.com','abc.sherubtse@rub.edu.bt','123.sherubtse@rub.edu.bt.attacker.com']) expect(validStudentEmail(email)).toBe(false);
 });
 test('unprotected signup page gets a CSRF token',async()=>{
   const response=await request(app).get('/auth/signup');
   expect(response.status).toBe(200);
   expect(response.text).toContain('name="_csrf"');
   expect(response.text).not.toContain('name="role"');
 });
 test('submitting signup without CSRF token is blocked',async()=>{
   const response=await request(app).post('/auth/signup').send({name:'Tashi',email:'07270030.sherubtse@rub.edu.bt',password:'123456789012'});
   expect(response.status).toBe(403);
 });
 test('GET /auth/verify rejects invalid token',async()=>{
   const response=await request(app).get('/auth/verify?token=invalid');
   expect(response.status).toBe(400);
   expect(User.verifyToken).not.toHaveBeenCalled();
 });
 test('verification accepts a valid one-use hash and rejects reuse',async()=>{
   const raw='a'.repeat(64);
   User.verifyToken.mockResolvedValueOnce({id:1,email:'07270030.sherubtse@rub.edu.bt'}).mockResolvedValueOnce(null);
   let response=await request(app).get('/auth/verify?token='+raw);
   expect(response.status).toBe(200);
   expect(User.verifyToken).toHaveBeenCalledWith(crypto.createHash('sha256').update(raw).digest('hex'));
   response=await request(app).get('/auth/verify?token='+raw);
   expect(response.status).toBe(400);
 });
 test('unauthenticated account route redirects to login',async()=>{
   const response=await request(app).get('/account');
   expect(response.status).toBe(302);
   expect(response.headers.location).toBe('/auth/login');
 });
});
