const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { query: dbQuery } = require('../config/database');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all counter types
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT id, type_name, status
            FROM countertype
            WHERE status = 1
            ORDER BY id
        `;
        
        const counterTypes = await dbQuery(query);
        
        res.json({
            success: true,
            message: 'Counter types retrieved successfully',
            data: counterTypes,
            count: counterTypes.length
        });
    } catch (error) {
        console.error('Error fetching counter types:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch counter types',
            error: error.message
        });
    }
});

// Get counter type by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT id, type_name, status
            FROM countertype
            WHERE id = ?
        `;
        
        const counterTypes = await dbQuery(query, [id]);
        
        if (counterTypes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Counter type not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Counter type retrieved successfully',
            data: counterTypes[0]
        });
    } catch (error) {
        console.error('Error fetching counter type:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch counter type',
            error: error.message
        });
    }
});

module.exports = router;
