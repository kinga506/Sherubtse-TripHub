const {validateActivity,validateNotice}=require('../models/TripUpdates');
describe('Step 13: itinerary and announcement validation',()=>{
 test('validates activity fields',()=>{expect(validateActivity({day_number:2,start_time:'09:30',title:'Nature walk',description:'Meet at entrance'})).toEqual({day:2,time:'09:30',title:'Nature walk',description:'Meet at entrance'});});
 test('refuses invalid day or time',()=>{expect(()=>validateActivity({day_number:0,title:'Walk'})).toThrow();expect(()=>validateActivity({day_number:1,start_time:'26:70',title:'Walk'})).toThrow();});
 test('announcement requires a message and handles important flag',()=>{expect(validateNotice({title:'Departure update',body:'Please arrive early',is_important:'on'}).important).toBe(true);expect(()=>validateNotice({title:'',body:'Text'})).toThrow();});
});
