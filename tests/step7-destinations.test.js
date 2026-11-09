// Public route/permission tests with the database model mocked.
jest.mock('../models/Destination', () => ({
  getAll: jest.fn(),getBySlug: jest.fn(),getPhotos: jest.fn(),getPublicTrips: jest.fn()
}));
const Destination=require('../models/Destination');
const controller=require('../controllers/destinationController');
function response(){return {status:jest.fn().mockReturnThis(),render:jest.fn()};}
const next=jest.fn();
beforeEach(()=>{jest.clearAllMocks();});
test('public gallery uses destination records and not private proposals',async()=>{
  Destination.getAll.mockResolvedValue([{slug:'chorten-kora',name:'Chorten Kora'}]);
  const res=response();await controller.gallery({},res,next);
  expect(res.render).toHaveBeenCalledWith('destinations/index',expect.objectContaining({destinations:[{slug:'chorten-kora',name:'Chorten Kora'}]}));
});
test('unknown destination returns 404',async()=>{
  Destination.getBySlug.mockResolvedValue(null);const res=response();
  await controller.detail({params:{slug:'not-found'}},res,next);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(Destination.getPublicTrips).not.toHaveBeenCalled();
});
test('malformed slug returns 404 without query',async()=>{
  const res=response();await controller.detail({params:{slug:'../../private'}},res,next);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(Destination.getBySlug).not.toHaveBeenCalled();
});
test('detail only fetches trips for destination id',async()=>{
  Destination.getBySlug.mockResolvedValue({id:7,slug:'bumdeling',name:'Bumdeling'});
  Destination.getPhotos.mockResolvedValue([]);Destination.getPublicTrips.mockResolvedValue([]);
  const res=response();await controller.detail({params:{slug:'bumdeling'}},res,next);
  expect(Destination.getPublicTrips).toHaveBeenCalledWith(7);
  expect(res.render).toHaveBeenCalledWith('destinations/detail',expect.objectContaining({trips:[],seasonWarning:expect.any(String)}));
});
