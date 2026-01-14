const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
    getAllPurchases,
    getPurchaseById,
    createPurchase,
    updatePurchase,
    deletePurchase
} = require('../controllers/productPurchaseController');

// All routes require authentication
router.use(verifyToken);

// GET all product purchases
router.get('/', getAllPurchases);

// GET single product purchase by ID
router.get('/:id', getPurchaseById);

// POST create new product purchase
router.post('/', createPurchase);

// PUT update product purchase
router.put('/:id', updatePurchase);

// DELETE product purchase
router.delete('/:id', deletePurchase);

module.exports = router;
