const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Order routes
router.get('/', orderController.getAllOrders);
// Lightweight month-based summary (no line items) e.g. /api/orders/summary?months=2025-08,2025-09
router.get('/summary', orderController.getOrdersByMonths);

// Specific routes must come BEFORE generic ":id" to avoid shadowing
router.get('/stats/last-6-months', orderController.getLastSixMonthsTotals);
router.get('/stats/rep-month-counters', orderController.getRepMonthCounterTotals);
// New: Rep new-counters-specific monthly totals and detailed orders
router.get('/stats/rep-new-counters-monthly', orderController.getRepMonthNewCountersTotals);
router.get('/stats/rep-new-counters-orders', orderController.getRepMonthOrdersForNewCounters);
// Dues by counter (aggregate outstanding), optional ?repId=
router.get('/stats/dues-by-counter', orderController.getDuesByCounter);
router.get('/counter/:counterId', orderController.getOrdersByCounter);
router.get('/invoice/:fileName', orderController.downloadInvoice);
// Heavy detail fetch explicit path (alternative to generic :id)
router.get('/:id/details', orderController.getOrderById);

// Generic ID-based routes
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
