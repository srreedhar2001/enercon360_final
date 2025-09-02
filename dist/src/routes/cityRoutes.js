const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// City routes
router.get('/', cityController.getAllCities);
router.get('/:id', cityController.getCityById);
router.get('/state/:state', cityController.getCitiesByState);

module.exports = router;
