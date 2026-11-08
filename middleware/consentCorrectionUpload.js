const multer=require('multer');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1,fields:8}}).single('consent_letter');
function parseConsentCorrection(req,res,next){
 if(req.method!=='POST'||!/^\/workspace\/my-trips\/[1-9]\d*\/consent\/replace\/?$/.test(req.path))return next();
 upload(req,res,error=>error?res.status(422).send('Invalid consent upload (maximum 10 MB)'):next());
}
module.exports={parseConsentCorrection};
