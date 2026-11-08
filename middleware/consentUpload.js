const multer=require('multer');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1,fields:8}}).single('consent_letter');
function parseConsentUpload(req,res,next){
 if(req.method!=='POST'||!/^\/trips\/[1-9]\d*\/join\/?$/.test(req.path))return next();
 upload(req,res,error=>error?res.status(422).send(error.code==='LIMIT_FILE_SIZE'?'Consent letter exceeds 10 MB':'Invalid consent upload'):next());
}
module.exports={parseConsentUpload};
