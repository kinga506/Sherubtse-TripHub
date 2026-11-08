const Attendance=require('../models/Attendance');
const trip={start_date:'2026-11-01',end_date:'2026-11-03',is_active:true,approval_status:'approved',operational_status:'ongoing'};
describe('Step 16 attendance validation',()=>{
 test('accepts exact dates within trip',()=>expect(Attendance.validDay('2026-11-02',trip,'2026-11-08')).toBe('2026-11-02'));
 test('rejects impossible date',()=>expect(()=>Attendance.dateOnly('2026-02-30')).toThrow());
 test('rejects outside trip',()=>expect(()=>Attendance.validDay('2026-10-31',trip,'2026-11-08')).toThrow());
 test('rejects future attendance marking',()=>expect(()=>Attendance.validDay('2026-11-03',trip,'2026-11-02')).toThrow());
 test('completed trip is read-only',()=>expect(Attendance.writable({...trip,operational_status:'completed'})).toBe(false));
 test('CSV escapes commas, quotes and spreadsheet injection',()=>{
  const text=Attendance.csv('attendance',[{attendance_date:'2026-11-01',student_id:'123',name:'=SUM(1,2) "hello"',status:'present'}]);
  expect(text).toContain("'=SUM(1,2) \"\"hello\"\"");
  expect(text).toContain('attendance_date,student_id,name,status');
 });
 test('expenses export includes numeric column',()=>expect(Attendance.csv('expenses',[])).toContain('spent_on,category,description,amount'));
});
