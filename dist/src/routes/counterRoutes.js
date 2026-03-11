const express = require('express');
const router = express.Router();
const counterController = require('../controllers/counterController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Counter routes
router.get('/', counterController.getAllCounters);
// New: created counters monthly summary and month filter
router.get('/stats/last-6-months-created', counterController.getLastSixMonthsCreatedTotals);
router.get('/created', counterController.getCountersByCreatedMonth);
router.get('/:id', counterController.getCounterById);
router.post('/', counterController.createCounter);
router.put('/:id', counterController.updateCounter);
// Update only finance fields
router.patch('/:id/finance', counterController.updateCounterFinance);
// Update only counterStatus
router.patch('/:id/status', counterController.updateCounterStatus);
router.delete('/:id', counterController.deleteCounter);

// Additional routes
router.get('/city/:cityId', counterController.getCountersByCity);
router.get('/representative/:repId', counterController.getCountersByRepresentative);

module.exports = router;
