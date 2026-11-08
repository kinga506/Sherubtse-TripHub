const multer=require('multer');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1,fields:4}}).single('attachment');
// Parse only the private proposal-upload route before global CSRF verification.
// Without this middleware req.body is empty at the time ensureCsrf runs.
function parseProposalUpload(req,res,next){
 if(req.method!=='POST'||!/^\/workspace\/proposals\/[1-9]\d*\/attachments\/?$/.test(req.path))return next();
 upload(req,res,error=>error?res.status(422).send(error.code==='LIMIT_FILE_SIZE'?'File exceeds 10 MB':'Invalid upload'):next());
}
module.exports={parseProposalUpload};
