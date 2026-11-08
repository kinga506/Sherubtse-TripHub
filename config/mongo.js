// One MongoDB connection for trip feedback; never open a connection per request.
const {MongoClient}=require('mongodb');
let client=null;
let database=null;
let connecting=null;
const DATABASE='sherubtse_triphub_feedback';
async function connectMongo(uri=process.env.MONGO_URI){
 if(database)return database;
 if(connecting)return connecting;
 if(!uri)throw new Error('MONGO_URI must be configured');
 connecting=(async()=>{
  const newClient=new MongoClient(uri,{serverSelectionTimeoutMS:7000});
  try{
   await newClient.connect();
   const db=newClient.db(DATABASE);
   await db.collection('feedback').createIndex({tripId:1,studentId:1},{unique:true,name:'one_feedback_per_student_trip'});
   await db.collection('feedback').createIndex({tripId:1,createdAt:-1});
   client=newClient;database=db;
   return database;
  }catch(error){await newClient.close().catch(()=>{});throw error;}
 })();
 try{return await connecting;}finally{connecting=null;}
}
function getMongo(){if(!database)throw new Error('MongoDB feedback connection has not started');return database;}
async function closeMongo(){const old=client;client=null;database=null;connecting=null;if(old)await old.close();}
module.exports={connectMongo,getMongo,closeMongo};
