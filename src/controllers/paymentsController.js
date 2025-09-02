const { query: dbQuery } = require('../config/database');

// Get all payments with related information
const getPayments = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.*,
                pt.serviceTypeName as paymentType,
                u.name as userName,
                u.phone as userMobile,
                c.CounterName as counterName,
                c.phone as counterPhone
            FROM payments p
            LEFT JOIN paymenttype pt ON p.serviceTypeId = pt.id
            LEFT JOIN users u ON p.userId = u.id
            LEFT JOIN counters c ON p.counterId = c.id
            ORDER BY p.createdAt DESC
        `;
        
        const payments = await dbQuery(query);
        
        res.json({
            success: true,
            data: payments,
            message: 'Payments retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
};

// Get payment statistics
const getPaymentStatistics = async (req, res) => {
    try {
        // Total payments amount
        const totalPaymentsQuery = `
            SELECT COALESCE(SUM(amount), 0) as totalPayments 
            FROM payments
        `;
        const [totalPaymentsResult] = await dbQuery(totalPaymentsQuery);
        
        // Collections total (order payments)
        const collectionsQuery = `
            SELECT COALESCE(SUM(amount), 0) as totalCollections 
            FROM collections
        `;
        const [collectionsResult] = await dbQuery(collectionsQuery);
        
        // Today's payments
        const todayPaymentsQuery = `
            SELECT COALESCE(SUM(amount), 0) as todayPayments 
            FROM payments 
            WHERE DATE(paymentDate) = CURDATE()
        `;
        const [todayPaymentsResult] = await dbQuery(todayPaymentsQuery);
        
        // Today's collections
        const todayCollectionsQuery = `
            SELECT COALESCE(SUM(amount), 0) as todayCollections 
            FROM collections 
            WHERE DATE(transactionDate) = CURDATE()
        `;
        const [todayCollectionsResult] = await dbQuery(todayCollectionsQuery);
        
        // Total transactions count
        const totalTransactionsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM payments) + 
                (SELECT COUNT(*) FROM collections) as totalTransactions
        `;
        const [totalTransactionsResult] = await dbQuery(totalTransactionsQuery);
        
        // Payment type breakdown
        const paymentTypeBreakdownQuery = `
            SELECT 
                pt.serviceTypeName,
                COUNT(p.id) as count,
                COALESCE(SUM(p.amount), 0) as totalAmount
            FROM paymenttype pt
            LEFT JOIN payments p ON pt.id = p.serviceTypeId
            WHERE pt.isActive = 1
            GROUP BY pt.id, pt.serviceTypeName
            ORDER BY totalAmount DESC
        `;
        const paymentTypeBreakdown = await dbQuery(paymentTypeBreakdownQuery);
        
        // Pending orders (unpaid)
        const pendingOrdersQuery = `
            SELECT COALESCE(SUM(grandTotal), 0) as pendingAmount 
            FROM orders 
            WHERE paymentReceived = 0
        `;
        const [pendingOrdersResult] = await dbQuery(pendingOrdersQuery);
        
        const statistics = {
            totalPayments: parseFloat(totalPaymentsResult.totalPayments),
            totalCollections: parseFloat(collectionsResult.totalCollections),
            todayPayments: parseFloat(todayPaymentsResult.todayPayments),
            todayCollections: parseFloat(todayCollectionsResult.todayCollections),
            totalTransactions: parseInt(totalTransactionsResult.totalTransactions),
            pendingAmount: parseFloat(pendingOrdersResult.pendingAmount),
            paymentTypeBreakdown
        };
        
        res.json({
            success: true,
            data: statistics,
            message: 'Payment statistics retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching payment statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment statistics'
        });
    }
};

// Get payment types for dropdown
const getPaymentTypes = async (req, res) => {
    try {
        const query = `
            SELECT id, serviceTypeName, description
            FROM paymenttype 
            WHERE isActive = 1
            ORDER BY serviceTypeName
        `;
        
        const paymentTypes = await dbQuery(query);
        
        res.json({
            success: true,
            data: paymentTypes,
            message: 'Payment types retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching payment types:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment types'
        });
    }
};

// Add new payment
const addPayment = async (req, res) => {
    try {
        const { serviceTypeId, userId, counterId, amount, paymentDate, comments } = req.body;
        
        // Validate required fields
        if (!serviceTypeId || !amount || !paymentDate) {
            return res.status(400).json({
                success: false,
                message: 'Service type, amount, and payment date are required'
            });
        }
        
        // Validate payment type exists
        const paymentTypeQuery = `
            SELECT id, serviceTypeName FROM paymenttype 
            WHERE id = ? AND isActive = 1
        `;
        const [paymentType] = await dbQuery(paymentTypeQuery, [serviceTypeId]);
        
        if (!paymentType) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment type'
            });
        }
        
        // Validate amount
        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        // Enforce business rules by payment type
        const typeName = (paymentType.serviceTypeName || '').toLowerCase();
        const hasUser = !!userId;
        const hasCounter = !!counterId;

        if ((typeName === 'salary' || typeName === 'expenses')) {
            if (!hasUser) {
                return res.status(400).json({ success: false, message: 'User is required for Salary/Expenses payments' });
            }
            if (hasCounter) {
                return res.status(400).json({ success: false, message: 'Counter must not be provided for Salary/Expenses payments' });
            }
        } else if (typeName === 'counter service') {
            if (!hasCounter) {
                return res.status(400).json({ success: false, message: 'Counter is required for Counter Service payments' });
            }
            if (hasUser) {
                return res.status(400).json({ success: false, message: 'User must not be provided for Counter Service payments' });
            }
        } else {
            // Other types should not include user or counter
            if (hasUser || hasCounter) {
                return res.status(400).json({ success: false, message: 'User/Counter should not be provided for this payment type' });
            }
        }
        
        // Insert payment record
        const insertQuery = `
            INSERT INTO payments (serviceTypeId, userId, counterId, amount, paymentDate, comments, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        const result = await dbQuery(insertQuery, [
            serviceTypeId, 
            userId || null, 
            counterId || null, 
            amount, 
            paymentDate, 
            comments || null
        ]);
        
        res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                serviceTypeId,
                userId,
                counterId,
                amount,
                paymentDate,
                comments
            },
            message: 'Payment added successfully'
        });
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add payment: ' + error.message
        });
    }
};

// Get specific payment details
const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                p.*,
                pt.serviceTypeName as paymentType,
                pt.description as paymentTypeDescription,
                u.name as userName,
                u.phone as userMobile,
                c.CounterName as counterName,
                c.phone as counterPhone,
                c.address as counterAddress
            FROM payments p
            LEFT JOIN paymenttype pt ON p.serviceTypeId = pt.id
            LEFT JOIN users u ON p.userId = u.id
            LEFT JOIN counters c ON p.counterId = c.id
            WHERE p.id = ?
        `;
        
        const [payment] = await dbQuery(query, [id]);
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        
        res.json({
            success: true,
            data: payment,
            message: 'Payment details retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment details'
        });
    }
};

// Update payment
const updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { serviceTypeId, userId, counterId, amount, paymentDate, comments } = req.body;
        
        // Check if payment exists
        const existingQuery = `SELECT * FROM payments WHERE id = ?`;
        const [existing] = await dbQuery(existingQuery, [id]);
        
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        // Resolve effective values (allow partial updates)
        const effServiceTypeId = serviceTypeId || existing.serviceTypeId;
        const effUserId = (userId !== undefined) ? userId : existing.userId;
        const effCounterId = (counterId !== undefined) ? counterId : existing.counterId;
        const effAmount = amount || existing.amount;
        const effPaymentDate = paymentDate || existing.paymentDate;
        const effComments = (comments !== undefined) ? comments : existing.comments;

        // Validate payment type exists and fetch name
        const paymentTypeQuery = `SELECT id, serviceTypeName FROM paymenttype WHERE id = ? AND isActive = 1`;
        const [paymentType] = await dbQuery(paymentTypeQuery, [effServiceTypeId]);
        if (!paymentType) {
            return res.status(400).json({ success: false, message: 'Invalid payment type' });
        }

        // Enforce business rules
        const typeName = (paymentType.serviceTypeName || '').toLowerCase();
        const hasUser = !!effUserId;
        const hasCounter = !!effCounterId;

        if ((typeName === 'salary' || typeName === 'expenses')) {
            if (!hasUser) {
                return res.status(400).json({ success: false, message: 'User is required for Salary/Expenses payments' });
            }
            if (hasCounter) {
                return res.status(400).json({ success: false, message: 'Counter must not be provided for Salary/Expenses payments' });
            }
        } else if (typeName === 'counter service') {
            if (!hasCounter) {
                return res.status(400).json({ success: false, message: 'Counter is required for Counter Service payments' });
            }
            if (hasUser) {
                return res.status(400).json({ success: false, message: 'User must not be provided for Counter Service payments' });
            }
        } else {
            if (hasUser || hasCounter) {
                return res.status(400).json({ success: false, message: 'User/Counter should not be provided for this payment type' });
            }
        }

        // Validate amount
        if (effAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
        }

        // Update payment
        const updateQuery = `
            UPDATE payments 
            SET serviceTypeId = ?, userId = ?, counterId = ?, amount = ?, 
                paymentDate = ?, comments = ?
            WHERE id = ?
        `;
        
        await dbQuery(updateQuery, [
            effServiceTypeId,
            effUserId || null,
            effCounterId || null,
            effAmount,
            effPaymentDate,
            effComments,
            id
        ]);
        
        res.json({
            success: true,
            message: 'Payment updated successfully'
        });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment'
        });
    }
};

// Delete payment
const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if payment exists
        const existingQuery = `SELECT * FROM payments WHERE id = ?`;
        const [existing] = await dbQuery(existingQuery, [id]);
        
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        
        // Delete payment
        const deleteQuery = `DELETE FROM payments WHERE id = ?`;
        await dbQuery(deleteQuery, [id]);
        
        res.json({
            success: true,
            message: 'Payment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete payment'
        });
    }
};

// Get users for dropdown
const getUsers = async (req, res) => {
    try {
        const query = `
            SELECT id, name, phone as mobile
            FROM users 
            ORDER BY name
        `;
        
        const users = await dbQuery(query);
        
        res.json({
            success: true,
            data: users,
            message: 'Users retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
};

// Get counters for dropdown
const getCounters = async (req, res) => {
    try {
        const query = `
            SELECT id, CounterName as name, phone
            FROM counters 
            ORDER BY CounterName
        `;
        
        const counters = await dbQuery(query);
        
        res.json({
            success: true,
            data: counters,
            message: 'Counters retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching counters:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch counters'
        });
    }
};

module.exports = {
    getPayments,
    getPaymentStatistics,
    getPaymentTypes,
    addPayment,
    getPaymentById,
    updatePayment,
    deletePayment,
    getUsers,
    getCounters
};
