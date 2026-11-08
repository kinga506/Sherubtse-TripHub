const packing=require('../models/Packing');
describe('Step 14 packing input and state checks',()=>{
 test('rejects empty or oversized names',()=>{
  expect(()=>packing.sanitize({name:' '})).toThrow('Item name');
  expect(()=>packing.sanitize({name:'x'.repeat(121)})).toThrow('Item name');
 });
 test('accepts a simple packing item with quantity',()=>{
  expect(packing.sanitize({name:'  Water bottle  ',quantity:'  1  '})).toEqual({name:'Water bottle',quantity:'1'});
 });
 test('enforces boolean packed state',()=>{
  expect(packing.parsePacked(true)).toBe(true);
  expect(packing.parsePacked(false)).toBe(false);
  expect(()=>packing.parsePacked('true')).toThrow('Packed must');
 });
 test('completed, awaiting report and cancelled trips are read only',()=>{
  const trip={is_active:true,approval_status:'approved',operational_status:'planned'};
  expect(packing.editable(trip)).toBe(true);
  for(const operational_status of ['completed','cancelled','awaiting_final_report']){
   expect(packing.editable({...trip,operational_status})).toBe(false);
  }
  expect(packing.editable({...trip,approval_status:'pending_dsa'})).toBe(false);
 });
});
