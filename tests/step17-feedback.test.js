// Mock both databases: assert trip-scoped access before MongoDB queries.
jest.mock('../config/db',()=>({getDb:jest.fn()}));
jest.mock('../config/mongo',()=>({getMongo:jest.fn()}));
const {getDb}=require('../config/db');
const {getMongo}=require('../config/mongo');
const Feedback=require('../models/Feedback');
const baseTrip={id:7,title:'Example trip',end_date:'2020-02-03',is_active:true,
 operational_status:'completed',student_name:'Sample Student'};
function mongoStub(){const insertOne=jest.fn().mockResolvedValue({insertedId:'ok'});
 const toArray=jest.fn().mockResolvedValue([]);const sort=jest.fn().mockReturnValue({toArray});
 const find=jest.fn().mockReturnValue({sort});
 getMongo.mockReturnValue({collection:jest.fn().mockReturnValue({insertOne,find})});return {insertOne,find};}
beforeEach(()=>{jest.clearAllMocks();});
test('validates stars and non-empty review text',()=>{
 expect(Feedback.validate('5','  Great trip  ')).toEqual({rating:5,comment:'Great trip'});
 expect(()=>Feedback.validate(0,'Good')).toThrow();
 expect(()=>Feedback.validate(3,' ')).toThrow();
 expect(()=>Feedback.validate(2,'a'.repeat(1501))).toThrow();
});
test('rejects unapproved students before any MongoDB operation',async()=>{
 getDb.mockReturnValue({oneOrNone:jest.fn().mockResolvedValue(null)});
 await expect(Feedback.createFeedback({tripId:7,studentId:4,rating:5,comment:'Great'})).rejects.toMatchObject({status:403});
 expect(getMongo).not.toHaveBeenCalled();
});
test('only a completed or awaiting-report ended trip accepts feedback',async()=>{
 const oneOrNone=jest.fn().mockResolvedValue({...baseTrip,end_date:'2099-02-03'});
 getDb.mockReturnValue({oneOrNone});
 await expect(Feedback.participation(7,4)).rejects.toMatchObject({status:409});
});
test('inserts scoped trip feedback using authenticated student identity',async()=>{
 getDb.mockReturnValue({oneOrNone:jest.fn().mockResolvedValue(baseTrip)});
 const mongo=mongoStub();
 await Feedback.createFeedback({tripId:7,studentId:4,rating:4,comment:'Enjoyed the trip'});
 expect(mongo.insertOne).toHaveBeenCalledWith(expect.objectContaining({tripId:7,studentId:4,studentName:'Sample Student',rating:4}));
});
test('duplicate reviews rejected by MongoDB unique index',async()=>{
 getDb.mockReturnValue({oneOrNone:jest.fn().mockResolvedValue(baseTrip)});
 const mongo=mongoStub();mongo.insertOne.mockRejectedValue({code:11000});
 await expect(Feedback.createFeedback({tripId:7,studentId:4,rating:4,comment:'Good'})).rejects.toMatchObject({status:409});
});
test('unassigned students cannot read coordinator summary',async()=>{
 getDb.mockReturnValue({oneOrNone:jest.fn().mockResolvedValueOnce({id:7,title:'Trip'}).mockResolvedValueOnce(null)});
 await expect(Feedback.coordinatorPage(7,4)).rejects.toMatchObject({status:403});
 expect(getMongo).not.toHaveBeenCalled();
});
test('coordinator history access includes ended assignments',async()=>{
 getDb.mockReturnValue({oneOrNone:jest.fn().mockResolvedValueOnce({id:7,title:'Trip'}).mockResolvedValueOnce({id:99})});
 mongoStub();await expect(Feedback.coordinatorPage(7,4)).resolves.toMatchObject({count:0});
});
