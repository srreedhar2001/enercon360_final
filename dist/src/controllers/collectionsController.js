const { query: dbQuery } = require('../config/database');

// Get all collections with order and counter details
const getCollections = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.*,
                o.invoiceFileName,
                o.grandTotal as orderTotal,
                o.paymentReceived,
                o.orderDate,
                cnt.CounterName as counterName,
                cnt.phone as counterPhone,
                cnt.address as counterAddress
            FROM collections c
            LEFT JOIN orders o ON c.orderID = o.id
            LEFT JOIN counters cnt ON o.counterID = cnt.id
            ORDER BY c.createdAt DESC
        `;
        
        const collections = await dbQuery(query);
        
        res.json({
            success: true,
            data: collections,
            message: 'Collections retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collections'
        });
    }
};

// Get collections statistics
const getCollectionsStatistics = async (req, res) => {
    try {
        // Total collected amount
        const totalCollectedQuery = `
            SELECT COALESCE(SUM(amount), 0) as totalCollected 
            FROM collections
        `;
        const [totalCollectedResult] = await dbQuery(totalCollectedQuery);
        
        // Pending amount (unpaid orders)
        const pendingAmountQuery = `
            SELECT COALESCE(SUM(grandTotal), 0) as pendingAmount 
            FROM orders 
            WHERE paymentReceived = 0
        `;
        const [pendingAmountResult] = await dbQuery(pendingAmountQuery);
        
        // Today's collections
        const todayCollectionsQuery = `
            SELECT COALESCE(SUM(amount), 0) as todayCollections 
            FROM collections 
            WHERE DATE(transactionDate) = CURDATE()
        `;
        const [todayCollectionsResult] = await dbQuery(todayCollectionsQuery);
        
        // Total transactions count
        const totalTransactionsQuery = `
            SELECT COUNT(*) as totalTransactions 
            FROM collections
        `;
        const [totalTransactionsResult] = await dbQuery(totalTransactionsQuery);
        
        const statistics = {
            totalCollected: parseFloat(totalCollectedResult.totalCollected),
            pendingAmount: parseFloat(pendingAmountResult.pendingAmount),
            todayCollections: parseFloat(todayCollectionsResult.todayCollections),
            totalTransactions: parseInt(totalTransactionsResult.totalTransactions)
        };
        
        res.json({
            success: true,
            data: statistics,
            message: 'Statistics retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
};

// Add new collection
const addCollection = async (req, res) => {

    try {
        const { orderID, amount, transactionDate, comments, markAsPaid } = req.body;
        
        // Validate required fields
        if (!orderID || !amount || !transactionDate) {
            return res.status(400).json({
                success: false,
                message: 'Order ID, amount, and transaction date are required'
            });
        }
        
        // Check if order exists
        const orderQuery = `
            SELECT id, grandTotal, paymentReceived 
            FROM orders 
            WHERE id = ?
        `;
        const [order] = await dbQuery(orderQuery, [orderID]);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check if amount is valid against remaining amount (existing collections)
        const [existingCollectedRow] = await dbQuery(
            `SELECT COALESCE(SUM(amount), 0) AS totalCollected FROM collections WHERE orderID = ?`,
            [orderID]
        );
        const alreadyCollected = parseFloat(existingCollectedRow.totalCollected || 0);
        const remainingBefore = Math.max(0, parseFloat(order.grandTotal) - alreadyCollected);
        if (amount <= 0 || amount > remainingBefore) {
            return res.status(400).json({
                success: false,
                message: 'Invalid collection amount: exceeds remaining amount'
            });
        }
        
        // Insert collection record
        const insertQuery = `
            INSERT INTO collections (orderID, amount, transactionDate, comments, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, NOW(), NOW())
        `;
        const result = await dbQuery(insertQuery, [orderID, amount, transactionDate, comments || null]);

        // Recalculate total collected for this order after insert
        const [totalCollectedRow] = await dbQuery(
            `SELECT COALESCE(SUM(amount), 0) AS totalCollected FROM collections WHERE orderID = ?`,
            [orderID]
        );
        const totalCollected = parseFloat(totalCollectedRow.totalCollected || 0);
        // Decide final paid status: user intent OR auto if totals cover grand total
        const shouldMarkAsPaid = !!markAsPaid || (totalCollected >= parseFloat(order.grandTotal));

        if (shouldMarkAsPaid) {
            const updateOrderQuery = `
                UPDATE orders 
                SET paymentReceived = 1, updatedAt = NOW() 
                WHERE id = ?
            `;
            await dbQuery(updateOrderQuery, [orderID]);
        }
        
        res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                orderID,
                amount,
                transactionDate,
                comments,
                paymentUpdated: shouldMarkAsPaid,
                totalCollected
            },
            message: 'Collection added successfully'
        });
    } catch (error) {
        console.error('Error adding collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add collection2: ' + error.message
        });
    }
};

// Get collections for a specific order
const getCollectionsByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const query = `
            SELECT 
                c.id,
                c.amount,
                c.transactionDate as collection_date,
                c.comments,
                c.createdAt,
                c.updatedAt
            FROM collections c
            WHERE c.orderID = ?
            ORDER BY c.transactionDate DESC, c.createdAt DESC
        `;
        
        const collections = await dbQuery(query, [orderId]);
        
        res.json(collections);
    } catch (error) {
        console.error('Error fetching collections by order ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collections for order'
        });
    }
};

// Get specific collection details
const getCollectionById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                c.*,
                o.invoiceFileName,
                o.grandTotal as orderTotal,
                o.paymentReceived,
                o.orderDate,
                cnt.CounterName as counterName,
                cnt.phone as counterPhone,
                cnt.address as counterAddress
            FROM collections c
            LEFT JOIN orders o ON c.orderID = o.id
            LEFT JOIN counters cnt ON o.counterID = cnt.id
            WHERE c.id = ?
        `;
        
        const [collection] = await dbQuery(query, [id]);
        
        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found'
            });
        }
        
        // Get all collections for this order
        const orderCollectionsQuery = `
            SELECT * FROM collections 
            WHERE orderID = ? 
            ORDER BY transactionDate ASC
        `;
        const orderCollections = await dbQuery(orderCollectionsQuery, [collection.orderID]);
        
        res.json({
            success: true,
            data: {
                ...collection,
                orderCollections
            },
            message: 'Collection details retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collection details'
        });
    }
};

// Update collection
const updateCollection = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, transactionDate, comments } = req.body;
        
        // Check if collection exists
        const existingQuery = `SELECT * FROM collections WHERE id = ?`;
        const [existing] = await dbQuery(existingQuery, [id]);
        
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found'
            });
        }
        
        // Update collection
        const updateQuery = `
            UPDATE collections 
            SET amount = ?, transactionDate = ?, comments = ?, updatedAt = NOW()
            WHERE id = ?
        `;
        
        await dbQuery(updateQuery, [
            amount || existing.amount,
            transactionDate || existing.transactionDate,
            comments !== undefined ? comments : existing.comments,
            id
        ]);
        
        // Recalculate order payment status
        const orderID = existing.orderID;
        const orderQuery = `SELECT grandTotal FROM orders WHERE id = ?`;
        const [order] = await dbQuery(orderQuery, [orderID]);
        
        const totalCollectedQuery = `
            SELECT COALESCE(SUM(amount), 0) as totalCollected 
            FROM collections 
            WHERE orderID = ?
        `;
        const [totalCollected] = await dbQuery(totalCollectedQuery, [orderID]);
        
        const isFullyPaid = parseFloat(totalCollected.totalCollected) >= parseFloat(order.grandTotal);
        
        const updateOrderQuery = `
            UPDATE orders 
            SET paymentReceived = ?, updatedAt = NOW() 
            WHERE id = ?
        `;
        await dbQuery(updateOrderQuery, [isFullyPaid ? 1 : 0, orderID]);
        
        res.json({
            success: true,
            message: 'Collection updated successfully'
        });
    } catch (error) {
        console.error('Error updating collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update collection'
        });
    }
};

// Delete collection
const deleteCollection = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get collection details before deletion
        const collectionQuery = `SELECT * FROM collections WHERE id = ?`;
        const [collection] = await dbQuery(collectionQuery, [id]);
        
        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found'
            });
        }
        
        // Delete collection
        const deleteQuery = `DELETE FROM collections WHERE id = ?`;
        await dbQuery(deleteQuery, [id]);
        
        // Recalculate order payment status
        const orderID = collection.orderID;
        const orderQuery = `SELECT grandTotal FROM orders WHERE id = ?`;
        const [order] = await dbQuery(orderQuery, [orderID]);
        
        const totalCollectedQuery = `
            SELECT COALESCE(SUM(amount), 0) as totalCollected 
            FROM collections 
            WHERE orderID = ?
        `;
        const [totalCollected] = await dbQuery(totalCollectedQuery, [orderID]);
        
        const isFullyPaid = parseFloat(totalCollected.totalCollected) >= parseFloat(order.grandTotal);
        
        const updateOrderQuery = `
            UPDATE orders 
            SET paymentReceived = ?, updatedAt = NOW() 
            WHERE id = ?
        `;
        await dbQuery(updateOrderQuery, [isFullyPaid ? 1 : 0, orderID]);
        
        res.json({
            success: true,
            message: 'Collection deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete collection'
        });
    }
};

module.exports = {
    getCollections,
    getCollectionsStatistics,
    addCollection,
    getCollectionById,
    getCollectionsByOrderId,
    updateCollection,
    deleteCollection
};
