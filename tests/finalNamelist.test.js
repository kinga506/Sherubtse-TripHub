const {PDFDocument}=require('pdf-lib');
const {composePackage,rosterSnapshot}=require('../services/finalNamelistPdf');
const {validateRoster}=require('../models/FinalNamelist');

describe('Step 12A final namelist',()=>{
 const trip={id:7,title:'Test trip',max_participants:10,approval_status:'approved',is_active:true,operational_status:'planned'};
 function participants(n){return Array.from({length:n},(_,i)=>({participant_id:i+1,user_id:100+i,name:`Demo Student ${i+1}`,student_id:`ST${i+1}`,consent_document_id:300+i,consent_version:1,verification_status:'verified',storage_key:`file${i}`,mime:'application/pdf'}));}
 test('8 confirmed of 10 passes while zero does not',()=>{
  expect(()=>validateRoster(trip,participants(8))).not.toThrow();
  expect(()=>validateRoster(trip,[])).toThrow(/At least one/);
 });
 test('unverified consent blocks submission',()=>{
  const r=participants(1);r[0].verification_status='correction_requested';expect(()=>validateRoster(trip,r)).toThrow(/verified/);
 });
 test('snapshot tracks each particular consent document version',()=>{
  const a=participants(2);const original=rosterSnapshot(a);a[0].consent_version=2;expect(rosterSnapshot(a)).not.toEqual(original);
 });
 test('combines PDF pages after a named cover and label',async()=>{
  const source=await PDFDocument.create();source.addPage([300,400]);const sourceBytes=Buffer.from(await source.save());
  const bytes=await composePackage(trip,participants(2),async()=>sourceBytes);
  const output=await PDFDocument.load(bytes);expect(output.getPageCount()).toBe(5);
 });
 test('refuses unreadable PDF uploads',async()=>{
  await expect(composePackage(trip,participants(1),async()=>Buffer.from('not-pdf'))).rejects.toThrow();
 });
});
