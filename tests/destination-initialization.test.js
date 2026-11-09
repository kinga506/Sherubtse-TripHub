const seed=require('../db/seed-data.json');
const path=require('node:path');
const {initializeDestinations,EXPECTED_SLUGS}=require('../services/initializeDestinations');
const imageRoot=path.join(__dirname,'../public/images/destinations');

function database(initialDestinations=[],initialPhotos=[]) {
  const state={destinations:new Map(initialDestinations.map(row=>[row.slug,{...row}])),photos:new Map(initialPhotos.map(row=>[row.file_path,{...row}]))};
  const calls=[];
  const tx={
    none:jest.fn(async (sql,values)=>{
      calls.push({sql,values});
      if(sql.includes('INSERT INTO destinations')){
        const columns=['name','slug','dzongkhag','description','best_season','transport','transport_cost_min','transport_cost_max','entry_fee_note','distance_text','drive_time_text','trek_time_text','travel_note','practical_tip','is_trek'];
        const row=Object.fromEntries(columns.map((key,index)=>[key,values[index]]));
        if(!state.destinations.has(row.slug)) state.destinations.set(row.slug,{id:state.destinations.size+1,...row});
      } else if(sql.includes('INSERT INTO destination_photos')){
        const [destination_id,file_path,alt_text,photo_credit]=values;
        if(!state.photos.has(file_path)) state.photos.set(file_path,{destination_id,file_path,alt_text,photo_credit,sort_order:0});
      } else throw new Error(`Unexpected SQL: ${sql}`);
    }),
    any:jest.fn(async (sql,[slugs])=>{
      calls.push({sql,values:[slugs]});
      return [...state.destinations.values()].filter(row=>slugs.includes(row.slug));
    }),
    oneOrNone:jest.fn(async (sql,[key])=>{
      calls.push({sql,values:[key]});
      if(sql.includes('FROM destination_photos')) return state.photos.get(key)||null;
      if(sql.includes('FROM destinations')) return [...state.destinations.values()].find(row=>row.slug===key)||null;
      throw new Error(`Unexpected SQL: ${sql}`);
    })
  };
  const db={tx:jest.fn(async callback=>{
    const before={destinations:new Map([...state.destinations].map(([key,row])=>[key,{...row}])),photos:new Map([...state.photos].map(([key,row])=>[key,{...row}]))};
    try{return await callback(tx);}catch(error){state.destinations=before.destinations;state.photos=before.photos;throw error;}
  })};
  return {db,state,tx,calls};
}

function sourceRow(destination,id) {
  const columns=['name','slug','dzongkhag','description','best_season','transport','transport_cost_min','transport_cost_max','entry_fee_note','distance_text','drive_time_text','trek_time_text','travel_note','practical_tip','is_trek'];
  return {id,...Object.fromEntries(columns.map(key=>[key,destination[key]]))};
}

test('empty database receives only six source destinations and their valid photo references',async()=>{
  const {db,state,tx,calls}=database();
  const result=await initializeDestinations({db,seedDestinations:seed.destinations,imageRoot});
  expect(result).toEqual({destinationCount:6,photoCount:6});
  expect([...state.destinations.keys()].sort()).toEqual([...EXPECTED_SLUGS].sort());
  expect(state.photos.size).toBe(6);
  for(const destination of seed.destinations){
    const row=state.destinations.get(destination.slug);
    expect(row).toMatchObject(sourceRow(destination,row.id));
    expect(state.photos.get(destination.photo)).toMatchObject({destination_id:row.id,file_path:destination.photo,photo_credit:null});
  }
  expect(db.tx).toHaveBeenCalledTimes(1);
  expect(tx.none).toHaveBeenCalledTimes(12);
  expect(calls.filter(call=>call.sql.includes('INSERT INTO destinations')).every(call=>!call.sql.includes('guide_content'))).toBe(true);
});

test('already-populated database is safe to initialize repeatedly without duplicate or overwritten rows',async()=>{
  const initialDestinations=seed.destinations.map((destination,index)=>sourceRow(destination,index+21));
  initialDestinations.push({id:99,name:'Existing custom destination',slug:'existing-custom',dzongkhag:'Local',description:'Keep this unrelated record.',best_season:null,transport:null,transport_cost_min:null,transport_cost_max:null,entry_fee_note:null,distance_text:null,drive_time_text:null,trek_time_text:null,travel_note:null,practical_tip:null,is_trek:false});
  const initialPhotos=seed.destinations.map(destination=>({destination_id:initialDestinations.find(row=>row.slug===destination.slug).id,file_path:destination.photo,alt_text:`Existing photo: ${destination.name}`,photo_credit:'Existing verified credit',sort_order:0}));
  const {db,state}=database(initialDestinations,initialPhotos);
  const beforeDestinations=JSON.stringify([...state.destinations.values()]);
  const beforePhotos=JSON.stringify([...state.photos.values()]);
  await initializeDestinations({db,seedDestinations:seed.destinations,imageRoot});
  await initializeDestinations({db,seedDestinations:seed.destinations,imageRoot});
  expect(state.destinations.size).toBe(7);
  expect(state.destinations.has('existing-custom')).toBe(true);
  expect(state.photos.size).toBe(6);
  expect(JSON.stringify([...state.destinations.values()])).toBe(beforeDestinations);
  expect(JSON.stringify([...state.photos.values()])).toBe(beforePhotos);
});

test('existing conflicting source data fails and rolls back instead of overwriting it',async()=>{
  const existing=seed.destinations.map((destination,index)=>sourceRow(destination,index+1));
  existing[0].name='Locally maintained destination name';
  const {db,state}=database(existing,[]);
  await expect(initializeDestinations({db,seedDestinations:seed.destinations,imageRoot}))
    .rejects.toThrow('differs from the source in name');
  expect(state.destinations.get('chorten-kora').name).toBe('Locally maintained destination name');
  expect(state.photos.size).toBe(0);
});

test('initializer is explicit and does not create unrelated records or run at startup',()=>{
  const script=require('node:fs').readFileSync(path.join(__dirname,'../scripts/init-destinations.js'),'utf8');
  expect(script).toContain('if (require.main === module)');
  expect(script).not.toContain("require('./seed')");
  expect(script).not.toContain('INSERT INTO users');
  expect(script).not.toContain('INSERT INTO trips');
});
