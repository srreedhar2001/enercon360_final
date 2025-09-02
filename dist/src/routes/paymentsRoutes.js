const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
    getPayments,
    getPaymentStatistics,
    getPaymentTypes,
    addPayment,
    getPaymentById,
    updatePayment,
    deletePayment,
    getUsers,
    getCounters
} = require('../controllers/paymentsController');

// Apply authentication middleware to all routes
router.use(verifyToken);

// GET /api/payments - Get all payments
router.get('/', getPayments);

// GET /api/payments/statistics - Get payment statistics
router.get('/statistics', getPaymentStatistics);

// GET /api/payments/types - Get payment types for dropdown
router.get('/types', getPaymentTypes);

// GET /api/payments/users - Get users for dropdown
router.get('/users', getUsers);

// GET /api/payments/counters - Get counters for dropdown
router.get('/counters', getCounters);

// POST /api/payments - Add new payment
router.post('/', addPayment);

// GET /api/payments/:id - Get specific payment
router.get('/:id', getPaymentById);

// PUT /api/payments/:id - Update payment
router.put('/:id', updatePayment);

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', deletePayment);

module.exports = router;
