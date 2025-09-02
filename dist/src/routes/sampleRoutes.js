const express = require('express');
const router = express.Router();
const sampleController = require('../controllers/sampleController');
const { verifyToken } = require('../middleware');

// All sample routes require authentication
router.use(verifyToken);

// Routes for sample resource
router.get('/items', sampleController.getAll);
router.get('/items/:id', sampleController.getById);
router.post('/items', sampleController.create);
router.put('/items/:id', sampleController.update);
router.delete('/items/:id', sampleController.delete);

module.exports = router;
