const router = require('express').Router();
router.get('/', (req, res) => res.render('index', { title: 'Sherubtse TripHub', activeNav:'home' }));
router.get('/about', (req, res) => res.render('about', { title: 'About Sherubtse TripHub', activeNav:'about' }));
router.use('/destinations', require('./destinations'));
router.use('/trips', require('./trips'));
router.get('/design-system', (req, res) => res.render('design-system', { title: 'Interface guide' }));
router.get('/health', (req, res) => res.json({ status: 'ok', app: 'Sherubtse TripHub' }));
module.exports = router;
