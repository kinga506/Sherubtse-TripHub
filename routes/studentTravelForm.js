'use strict';
const router=require('express').Router();
const auth=require('../middleware/authorization');
const c=require('../controllers/studentTravelFormController');
router.get('/workspace/trips/:tripId/student-travel-form',auth.requireTripCoordinator,c.page);
router.post('/workspace/trips/:tripId/student-travel-form',auth.requireTripCoordinator,c.create);
router.get('/workspace/student-travel-forms/:formId/pdf',auth.requireAuth,c.download);
module.exports=router;
