// Dependency-free business-rule tests with Jest, no external database calls.
jest.mock('../config/db',()=>({getDb:jest.fn()}));
jest.mock('../config/mongo',()=>({getMongo:jest.fn()}));
jest.mock('../services/mailer',()=>({sendEmail:jest.fn()}));
const {validateReport,feedbackSnapshot}=require('../models/TripFinalReport');
const {getMongo}=require('../config/mongo');
describe('Step 18: immutable final-report inputs',()=>{
 test('requires an explicit incident statement',()=>{
  expect(()=>validateReport({incident_report:'  '})).toThrow(/Incidents|Describe/i);
  expect(validateReport({incident_report:'No incidents were reported.'}).incident).toBe('No incidents were reported.');
 });
 test('rejects overlong incident reports',()=>{
  expect(()=>validateReport({incident_report:'x'.repeat(3001)})).toThrow(/too long/i);
 });
 test('freezes feedback totals into a plain-text snapshot',async()=>{
  getMongo.mockReturnValue({collection:()=>({find:()=>({toArray:async()=>[
   {rating:4,comment:'Great experience',createdAt:new Date('2026-01-01')},
   {rating:5,comment:'Well organised',createdAt:new Date('2026-01-02')}
  ]})})});
  const snap=await feedbackSnapshot(5,true);
  expect(snap.count).toBe(2);expect(snap.average).toBe(4.5);
  expect(snap.summary).toMatch(/2 review/);
 });
 test('explicitly reports zero feedback',async()=>{
  getMongo.mockReturnValue({collection:()=>({find:()=>({toArray:async()=>[]})})});
  expect((await feedbackSnapshot(5,true)).summary).toMatch(/No student feedback/);
 });
 test('final report can record feedback unavailable without MongoDB',async()=>{
  const result=await feedbackSnapshot(5,false);
  expect(result).toMatchObject({count:0,average:null});
  expect(result.summary).toMatch(/Trip feedback was unavailable/);
  expect(getMongo).not.toHaveBeenCalled();
 });
});
