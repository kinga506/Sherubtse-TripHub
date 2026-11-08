const fs=require('node:fs');
const path=require('node:path');
const {PDFDocument}=require('pdf-lib');
const Form=require('../services/pdf/studentTravelForm');
const Model=require('../models/StudentTravelForm');
describe('Official two-page Sherubtse Student Travel Form',()=>{
 const template=fs.readFileSync(Form.TEMPLATE);
 const trip={start_date:'2027-04-01',meeting_time:'05:00:00',destination_name:'Chorten Kora'};
 const lead={name:'Sample Coordinator',programme:'Economics',academic_year:3,phone:'17123456'};
 test('actual travel departure is never silently derived from gathering time',()=>{
  const f=Form.buildFields(trip,lead);
  expect(f.timeOfTravel).toBe('');
  expect(Form.missing(f)).toContain('timeOfTravel');
 });
 test('missing official fields are listed, not fabricated',()=>{
  const f=Form.buildFields(trip,lead);
  expect(f.via).toBe('');expect(f.driverNameAndLicense).toBe('');
  expect(Form.missing(f)).toContain('driverNameAndLicense');
 });
 test('only whitelisted coordinator inputs can override the derived fields',()=>{
  const base=Form.buildFields(trip,lead);
  const updated=Model.validatedFields(base,{destination:'Fake location',vehicleType:'Bus'});
  expect(updated.destination).toBe('Chorten Kora');expect(updated.vehicleType).toBe('Bus');
 });
 test('original two pages retained with 8 confirmed students',async()=>{
  const f=Form.buildFields(trip,lead,{via:'Trashigang',vehicleType:'Bus',vehicleNumber:'BP-1234',driverNameAndLicense:'Driver, L-001',timeOfTravel:'06:00'});
  const people=Array.from({length:8},(_,i)=>({name:`Sample Student ${i+1}`,programme:'Economics',academic_year:2,residence_hall:'Hall A'}));
  const bytes=await Form.generate(template,f,people);
  const pdf=await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(2);
  expect(bytes.length).toBeGreaterThan(template.length/2);
 });
 test('the original form capacity cannot be silently truncated',async()=>{
  const f=Form.buildFields(trip,lead);
  await expect(Form.generate(template,f,Array.from({length:31},()=>({name:'Student'})))).rejects.toThrow('30');
 });
});
