// Pure validation tests: database-backed permissions and transactions require PostgreSQL integration tests.
jest.mock('../config/db',()=>({getDb:jest.fn()}));
const F=require('../models/Finance');
test('amount accepts two decimals and zero',()=>{expect(F.amount('120.50')).toBe('120.50');expect(F.amount('0')).toBe('0');});
test.each(['-1','12.345','abc','Infinity','1e3','10000000000',''])('amount rejects %s',v=>{expect(()=>F.amount(v)).toThrow();});
test('calendar date validates rollover',()=>{expect(()=>F.date('2026-02-30')).toThrow();expect(F.date('2028-02-29')).toBe('2028-02-29');});
test('expense categories and amount are validated',()=>{expect(()=>F.expenseInput({category:'other',amount:'4.20',spent_on:'2026-11-08'})).not.toThrow();expect(()=>F.expenseInput({category:'invalid',amount:'4',spent_on:'2026-11-08'})).toThrow();});
test('contributions require a participant identifier',()=>{expect(()=>F.contributionInput({user_id:'0',amount:'10',paid_on:'2026-11-08'})).toThrow();});
test('balance handles overpayment and cents',()=>{expect(F.balance('1800.00','1750.55')).toEqual({due:49.45,excess:0});expect(F.balance('1800','1900')).toEqual({due:0,excess:100});});
test('completed trips become read-only',()=>{expect(F.writable({is_active:true,approval_status:'approved',operational_status:'completed'})).toBe(false);expect(F.writable({is_active:true,approval_status:'approved',operational_status:'awaiting_final_report'})).toBe(true);});
