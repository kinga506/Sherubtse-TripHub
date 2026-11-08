require('dotenv').config();
const {reconcileAll}=require('../services/tripLifecycle');
const {sendPendingNotifications}=require('../models/TripFinalReport');
(async()=>{
 const result=await reconcileAll(500);
 const sent=await sendPendingNotifications(100);
 console.log(JSON.stringify({checked:result.length,results:result,sentNotifications:sent},null,2));
 if(result.some(r=>r.error))process.exitCode=1;
})().catch(err=>{console.error(err);process.exitCode=1;});
