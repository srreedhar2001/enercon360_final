const express = require('express');
const router = express.Router();
const representativeController = require('../controllers/representativeController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Representative routes
router.get('/', representativeController.getAllRepresentatives);
router.get('/search', representativeController.searchRepresentatives);
router.get('/:id', representativeController.getRepresentativeById);

module.exports = router;
