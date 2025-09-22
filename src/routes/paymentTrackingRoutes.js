const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/paymentTrackingController');

router.use(verifyToken);

// GET /api/payment-tracking/order/:orderId
router.get('/order/:orderId', ctrl.listByOrder);

// POST /api/payment-tracking
router.post('/', ctrl.addEntry);

module.exports = router;
