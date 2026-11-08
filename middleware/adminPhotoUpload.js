const multer=require('multer');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1,fields:5}}).single('photo');
function parseAdminPhotoUpload(req,res,next){
 if(req.method!=='POST'||req.path!=='/workspace/superadmin/photos/new')return next();
 upload(req,res,error=>error?res.status(422).send('Invalid destination photo upload'):next());
}
module.exports={parseAdminPhotoUpload};
