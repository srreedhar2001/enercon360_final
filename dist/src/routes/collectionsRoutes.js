const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
    getCollections,
    getCollectionsStatistics,
    addCollection,
    getCollectionById,
    getCollectionsByOrderId,
    updateCollection,
    deleteCollection
} = require('../controllers/collectionsController');

// Apply authentication middleware to all routes
router.use(verifyToken);

// GET /api/collections - Get all collections
router.get('/', getCollections);

// GET /api/collections/statistics - Get collections statistics
router.get('/statistics', getCollectionsStatistics);

// GET /api/collections/order/:orderId - Get collections for specific order
router.get('/order/:orderId', getCollectionsByOrderId);

// POST /api/collections - Add new collection
router.post('/', addCollection);

// GET /api/collections/:id - Get specific collection
router.get('/:id', getCollectionById);

// PUT /api/collections/:id - Update collection
router.put('/:id', updateCollection);

// DELETE /api/collections/:id - Delete collection
router.delete('/:id', deleteCollection);

module.exports = router;
