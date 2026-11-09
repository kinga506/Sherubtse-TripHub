// Public route/permission tests with the database model mocked.
jest.mock('../models/Destination', () => ({
  getAll: jest.fn(),getBySlug: jest.fn(),getPhotos: jest.fn(),getPublicTrips: jest.fn()
}));
const Destination=require('../models/Destination');
const controller=require('../controllers/destinationController');
const seed=require('../db/seed-data.json');
const fs=require('node:fs');
const path=require('node:path');
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

test('the six original destination guides contain complete source-based sections',()=>{
  expect(seed.destinations.map(item=>item.slug)).toEqual([
    'chorten-kora','bumdeling','merak-village','sakteng-village','dangling-tsho','takila'
  ]);
  for(const destination of seed.destinations){
    const guide=destination.guide_content;
    expect(guide.overview.trim().split(/\s+/).length).toBeGreaterThanOrEqual(120);
    expect(guide.overview.trim().split(/\s+/).length).toBeLessThanOrEqual(180);
    expect(guide.significance.trim().split(/\s+/).length).toBeGreaterThanOrEqual(100);
    expect(guide.significance.trim().split(/\s+/).length).toBeLessThanOrEqual(150);
    expect(guide.highlights.length).toBeGreaterThanOrEqual(3);
    expect(guide.highlights.length).toBeLessThanOrEqual(5);
    expect(guide.studentTips.length).toBeGreaterThan(0);
    expect(guide.safety).toBeTruthy();
    expect(guide.sources.length).toBeGreaterThan(0);
    for(const source of guide.sources){
      if(source.url) expect(source.url).toMatch(/^https:\/\//);
      else expect(source.reference).toMatch(/^TripPack\.docx/);
    }
    expect(fs.existsSync(path.join(__dirname,'../public',destination.photo))).toBe(true);
  }
});

test('destination guide template is semantic, escaped, and keeps the photo lightbox',async()=>{
  const template=fs.readFileSync(path.join(__dirname,'../views/destinations/detail.ejs'),'utf8');
  expect(template).toContain('<nav aria-label="Breadcrumb"');
  expect(template).toContain('<%= guide.overview');
  expect(template).toContain('data-lightbox-open');
  expect(template).toContain('College trips to this destination');
  expect(template).toContain('Sources and further information');
  expect(()=>require('ejs').compile(template)).not.toThrow();
  const destination={...seed.destinations[0],guide_content:{...seed.destinations[0].guide_content,overview:'<script>alert(1)</script>'}};
  const rendered=await require('ejs').renderFile(path.join(__dirname,'../views/destinations/detail.ejs'),{
    title:destination.name,activeNav:'destinations',currentUser:null,destination,photos:[],trips:[],seasonWarning:null
  });
  expect(rendered).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  expect(rendered).toContain('No destination photograph available');
  expect(rendered).toContain('id="photo-lightbox"');
});

test('destination content migration adds only the guide field and updates existing destination slugs',()=>{
  const migration=fs.readFileSync(path.join(__dirname,'../db/step22-destination-guides-migration.sql'),'utf8');
  const runner=fs.readFileSync(path.join(__dirname,'../scripts/migrate-destination-guides.js'),'utf8');
  expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS guide_content JSONB/i);
  expect(runner).toContain("UPDATE destinations SET guide_content=$2::jsonb WHERE slug=$1");
  expect(runner).toContain('Expected one existing destination');
  expect(runner).not.toMatch(/DELETE FROM|DROP TABLE|TRUNCATE/i);
});
