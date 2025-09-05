const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Order routes
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

// Additional routes
router.get('/stats/last-6-months', orderController.getLastSixMonthsTotals);
router.get('/counter/:counterId', orderController.getOrdersByCounter);

// Invoice routes
router.get('/invoice/:fileName', orderController.downloadInvoice);

module.exports = router;
