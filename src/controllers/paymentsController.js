const { query: dbQuery } = require('../config/database');

// Get all payments with related information
const getPayments = async (req, res) => {
    try {
        const { serviceTypeId, counterId, userId, fromDate, toDate } = req.query;
        
        // Build WHERE clause based on filters
        let whereConditions = [];
        let queryParams = [];
        
        if (serviceTypeId) {
            whereConditions.push('p.serviceTypeId = ?');
            queryParams.push(serviceTypeId);
        }
        
        if (counterId) {
            whereConditions.push('p.counterId = ?');
            queryParams.push(counterId);
        }
        
        if (userId) {
            whereConditions.push('p.userId = ?');
            queryParams.push(userId);
        }
        
        if (fromDate && toDate) {
            whereConditions.push('DATE(p.paymentDate) BETWEEN ? AND ?');
            queryParams.push(fromDate, toDate);
        }
        
        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ') 
            : '';
        
        const query = `
            SELECT 
                p.id AS PaymentID,
                pt.serviceTypeName,
                c.id AS CounterID,
                c.CounterName,
                c.CityID,
                c.drID,
                ct.type_name as counter_type_name,
                u.id AS RepID,
                u.name AS RepName,
                u.designation,
                u2.id AS UserID,
                u2.name AS UserName,
                u2.phone AS UserMobile,
                c.phone,
                c.gst,
                c.address,
                dr.drName AS DoctorName,
                p.amount,
                p.paymentDate,
                DATE_FORMAT(p.paymentDate, '%Y-%m-%d') as serviceDate,
                p.comments,
                p.businessTarget,
                p.createdAt
            FROM payments p
            LEFT JOIN paymenttype pt ON p.serviceTypeId = pt.id
            LEFT JOIN counters c ON p.counterId = c.id
            LEFT JOIN countertype ct ON c.counter_type = ct.id
            LEFT JOIN users u ON c.RepID = u.id
            LEFT JOIN users u2 ON p.userId = u2.id
            LEFT JOIN drcalls dr ON c.drID = dr.id
            ${whereClause}
            ORDER BY p.paymentDate DESC, p.id DESC
        `;
        
        const payments = await dbQuery(query, queryParams);
        
        // Transform to include both old format (paymentType as string) and new format (paymentType object)
        // This maintains backward compatibility with existing pages while supporting new features
        const transformedPayments = payments.map(payment => ({
            ...payment,
            id: payment.PaymentID, // Add lowercase id for frontend compatibility
            paymentType: payment.serviceTypeName, // Keep old format for backward compatibility
            paymentTypeObj: {  // New format for counter service report
                id: payment.PaymentID,
                serviceTypeName: payment.serviceTypeName,
                isCounterService: (payment.serviceTypeName || '').toLowerCase() === 'counter service'
            },
            serviceType: payment.serviceTypeName,
            representativeName: payment.RepName,
            counterName: payment.CounterName,
            userName: payment.UserName,
            userMobile: payment.UserMobile
        }));
        
        res.json({
            success: true,
            data: transformedPayments,
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

// Get monthly expenses (grouped by YYYY-MM), optional filters: repId (userId), from/to month (YYYY-MM)
const getMonthlyExpenses = async (req, res) => {
    try {
        const { repId, from, to } = req.query;

    // Build dynamic conditions
    const params = [];
    let where = ` WHERE 1=1 `;
    // Include ALL payment types by default (no filter on paymenttype)
        if (repId) {
            where += ` AND p.userId = ? `;
            params.push(repId);
        }
        if (from && to) {
            where += ` AND DATE_FORMAT(p.paymentDate, '%Y-%m') BETWEEN ? AND ? `;
            params.push(from, to);
        } else {
            // default: last 12 months including current
            where += ` AND p.paymentDate >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH) `;
        }

        const sql = `
            SELECT 
                DATE_FORMAT(p.paymentDate, '%Y-%m') AS ym,
                DATE_FORMAT(p.paymentDate, '%b %Y') AS label,
                COALESCE(SUM(CASE WHEN LOWER(pt.serviceTypeName) <> 'product purchase' THEN p.amount ELSE 0 END), 0) AS total,
                COALESCE(SUM(CASE WHEN LOWER(pt.serviceTypeName) = 'product purchase' THEN p.amount ELSE 0 END), 0) AS productPurchaseTotal
            FROM payments p
            INNER JOIN paymenttype pt ON p.serviceTypeId = pt.id
            ${where}
            GROUP BY ym, label
            ORDER BY ym ASC
        `;

        const rows = await dbQuery(sql, params);

        // Build complete month series
        let startDate;
        let endDate;
        if (from && to) {
            const [fy, fm] = String(from).split('-').map(n => parseInt(n, 10));
            const [ty, tm] = String(to).split('-').map(n => parseInt(n, 10));
            startDate = new Date(Date.UTC(fy, (fm - 1), 1));
            endDate = new Date(Date.UTC(ty, (tm - 1), 1));
        } else {
            const now = new Date();
            endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            startDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - 11, 1));
        }

        const map = Object.fromEntries(rows.map(r => [r.ym, {
            total: Number(r.total) || 0,
            productPurchaseTotal: Number(r.productPurchaseTotal) || 0
        }]));
        const data = [];
        const cur = new Date(startDate);
        while (cur <= endDate) {
            const ym = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`;
            const label = cur.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            const monthTotals = map[ym] || { total: 0, productPurchaseTotal: 0 };
            data.push({
                ym,
                label,
                total: Math.round(monthTotals.total),
                productPurchaseTotal: Math.round(monthTotals.productPurchaseTotal)
            });
            cur.setUTCMonth(cur.getUTCMonth() + 1);
        }

        return res.status(200).json({
            success: true,
            message: 'Monthly expenses fetched',
            data
        });
    } catch (error) {
        console.error('Error fetching monthly expenses:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch monthly expenses', error: error.message });
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
        const { serviceTypeId, userId, counterId, amount, paymentDate, comments, businessTarget } = req.body;
        
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
            INSERT INTO payments (serviceTypeId, userId, counterId, amount, paymentDate, comments, businessTarget, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const result = await dbQuery(insertQuery, [
            serviceTypeId, 
            userId || null, 
            counterId || null, 
            amount, 
            paymentDate, 
            comments || null,
            businessTarget || 0
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
                comments,
                businessTarget
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
        const { serviceTypeId, userId, counterId, amount, paymentDate, comments, businessTarget } = req.body;
        
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
        const effBusinessTarget = (businessTarget !== undefined) ? businessTarget : existing.businessTarget;

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
                paymentDate = ?, comments = ?, businessTarget = ?
            WHERE id = ?
        `;
        
        await dbQuery(updateQuery, [
            effServiceTypeId,
            effUserId || null,
            effCounterId || null,
            effAmount,
            effPaymentDate,
            effComments,
            effBusinessTarget || 0,
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
    getMonthlyExpenses,
    // Get detailed payments for a specific month (YYYY-MM) and optional repId
    getMonthlyExpensesDetails: async (req, res) => {
        try {
            const { ym, repId } = req.query;
            if (!ym || !/^\d{4}-\d{2}$/.test(String(ym))) {
                return res.status(400).json({ success: false, message: 'ym (YYYY-MM) is required' });
            }

            const params = [ym];
            let where = ` WHERE DATE_FORMAT(p.paymentDate, '%Y-%m') = ? `;
            if (repId) {
                where += ' AND p.userId = ? ';
                params.push(repId);
            }

            const sql = `
                SELECT 
                    p.id,
                    p.paymentDate,
                    DATE_FORMAT(p.paymentDate, '%Y-%m-%d') AS date,
                    p.amount,
                    p.comments,
                    pt.serviceTypeName AS paymentType,
                    u.name AS userName,
                    u.phone AS userMobile
                FROM payments p
                INNER JOIN paymenttype pt ON p.serviceTypeId = pt.id
                LEFT JOIN users u ON p.userId = u.id
                ${where} AND LOWER(pt.serviceTypeName) <> 'product purchase'
                ORDER BY p.paymentDate DESC, p.id DESC
            `;

            const rows = await dbQuery(sql, params);
            return res.status(200).json({ success: true, message: 'Monthly payments details fetched', data: rows });
        } catch (error) {
            console.error('Error fetching monthly payments details:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch monthly payments details', error: error.message });
        }
    },
    getMonthlyPaymentsTotals: async (req, res) => {
        try {
            const repIdRaw = req.query?.repId;
            const repIdNum = repIdRaw !== undefined && repIdRaw !== null && String(repIdRaw).trim().length
                ? Number(repIdRaw)
                : null;
            const hasRepFilter = Number.isFinite(repIdNum);

            // Build last 12-month timeline (including current month)
            const now = new Date();
            const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));

            // Query payments and collections grouped by month
            const paymentsParams = [];
            let paymentsWhere = 'WHERE p.paymentDate >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)';
            if (hasRepFilter) {
                paymentsWhere += ' AND p.userId = ?';
                paymentsParams.push(repIdNum);
            }
            const paymentsRows = await dbQuery(
                `SELECT DATE_FORMAT(p.paymentDate, '%Y-%m') AS ym,
                        DATE_FORMAT(p.paymentDate, '%b %Y') AS label,
                        COALESCE(SUM(p.amount), 0) AS total
                 FROM payments p
                 ${paymentsWhere}
                 GROUP BY ym, label
                 ORDER BY ym ASC`,
                paymentsParams
            );

            const collectionsParams = [];
            let collectionsWhere = 'WHERE col.transactionDate >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)';
            if (hasRepFilter) {
                collectionsWhere += ' AND cnt.RepID = ?';
                collectionsParams.push(repIdNum);
            }
            const collectionsRows = await dbQuery(
                `SELECT DATE_FORMAT(col.transactionDate, '%Y-%m') AS ym,
                        COALESCE(SUM(col.amount), 0) AS total
                 FROM collections col
                 INNER JOIN orders ord ON col.orderID = ord.id
                 INNER JOIN counters cnt ON ord.counterID = cnt.id
                 ${collectionsWhere}
                 GROUP BY ym
                 ORDER BY ym ASC`,
                collectionsParams
            );

            const payMap = Object.fromEntries(paymentsRows.map(r => [r.ym, { label: r.label, total: Number(r.total) || 0 }]));
            const colMap = Object.fromEntries(collectionsRows.map(r => [r.ym, Number(r.total) || 0]));

            const data = [];
            const cur = new Date(start);
            while (cur <= end) {
                const ym = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`;
                const label = cur.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                const p = payMap[ym];
                data.push({
                    ym,
                    label: (p && p.label) || label,
                    paymentsTotal: p ? p.total : 0,
                    collectionsTotal: colMap[ym] || 0
                });
                cur.setUTCMonth(cur.getUTCMonth() + 1);
            }

            return res.status(200).json({
                success: true,
                message: 'Monthly payments totals fetched',
                data,
                meta: {
                    repId: hasRepFilter ? repIdNum : null
                }
            });
        } catch (error) {
            console.error('Error fetching monthly payments totals:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch monthly payments totals', error: error.message });
        }
    },
    getPaymentTypes,
    addPayment,
    getPaymentById,
    updatePayment,
    deletePayment,
    getUsers,
    getCounters
};
