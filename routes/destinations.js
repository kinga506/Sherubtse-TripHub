const router=require('express').Router();
const controller=require('../controllers/destinationController');
router.get('/',controller.gallery);
router.get('/:slug',controller.detail);
module.exports=router;
