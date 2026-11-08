const router = require('express').Router();
const publicApi = require('../controllers/publicApiController');

// Read-only public API. Mutations and private trip resources are not exposed here.
router.get('/trips', publicApi.trips);
router.get('/trips/:id', publicApi.tripDetail);
router.get('/destinations', publicApi.destinations);
router.use((req, res) => res.status(404).json({ error: 'API endpoint not found' }));
module.exports = router;
