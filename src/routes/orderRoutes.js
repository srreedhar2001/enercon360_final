const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Order routes
router.get('/', orderController.getAllOrders);

// Specific routes must come BEFORE generic ":id" to avoid shadowing
router.get('/stats/last-6-months', orderController.getLastSixMonthsTotals);
router.get('/stats/rep-month-counters', orderController.getRepMonthCounterTotals);
router.get('/counter/:counterId', orderController.getOrdersByCounter);
router.get('/invoice/:fileName', orderController.downloadInvoice);

// Generic ID-based routes
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
