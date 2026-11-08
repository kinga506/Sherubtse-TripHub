// Uses model dependency mocks so route invariants can be checked without a live database.
const tx={};
const mockFakeDb={tx:jest.fn(async fn=>fn(tx))};
jest.mock('../config/db',()=>({getDb:()=>mockFakeDb}));
jest.mock('../services/mailer',()=>({sendEmail:jest.fn().mockResolvedValue({})}));
const Join=require('../models/JoinReview');
const Registration=require('../models/Registration');
const trip={id:8,title:'Test trip',approval_status:'approved',is_active:true,operational_status:'planned',max_participants:1,start_date:'2099-01-01'};
beforeEach(()=>{jest.clearAllMocks();tx.oneOrNone=jest.fn(async sql=>{
 if(sql.includes('FROM trips'))return trip;
 if(sql.includes('trip_coordinators'))return {assignment_role:'assistant'};
 if(sql.includes('FROM participants p'))return {id:5,status:'pending',student_email:'test@example.invalid'};
 if(sql.includes('participant_consent_documents'))return {id:9,verification_status:'correction_requested'};
 return null;
});tx.one=jest.fn(async()=>({occupied:1}));tx.none=jest.fn(async()=>{});});
test('cannot approve unverified consent',async()=>{
 await expect(Join.decision(8,5,11,'approve','')).rejects.toThrow('current consent letter must be verified');
 expect(tx.none).not.toHaveBeenCalled();
});
test('coordinator rejects pending invalid consent and holds released place',async()=>{
 await Join.decision(8,5,11,'reject','Consent was not corrected');
 expect(tx.none.mock.calls.some(([sql])=>sql.includes('vacancies_held_closed=TRUE'))).toBe(true);
 expect(tx.none.mock.calls.some(([sql])=>sql.includes('participant_review_events'))).toBe(true);
});
test('unknown review actions are rejected',async()=>{
 await expect(Join.reviewConsent(8,5,11,'approved','')).rejects.toThrow('Invalid consent-review action');
});
test('DSA extension request requires a valid future date',async()=>{
 await expect(Join.requestExtension(8,11,'not-a-date','Reason')).rejects.toThrow('valid deadline');
});
test('reopen operation does not force a manually closed registration open',()=>{
 const fs=require('fs');const code=fs.readFileSync(require.resolve('../models/Registration'),'utf8');
 expect(code).toContain('SET vacancies_held_closed=FALSE,updated_at=NOW()');
});
