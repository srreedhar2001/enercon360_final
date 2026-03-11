const db = require('../config/database');

/**
 * Get all leave types
 */
exports.getLeaveTypes = async (req, res) => {
    try {
        const leaveTypes = await db.query(
            'SELECT * FROM leave_types WHERE isActive = 1 ORDER BY name'
        );
        res.json({ success: true, data: leaveTypes });
    } catch (error) {
        console.error('Error fetching leave types:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leave types' });
    }
};

/**
 * Create a new leave type (Admin only)
 */
exports.createLeaveType = async (req, res) => {
    try {
        const { name, description, yearlyLimit } = req.body;

        if (!name || yearlyLimit === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name and yearly limit are required' 
            });
        }

        const result = await db.query(
            'INSERT INTO leave_types (name, description, yearlyLimit) VALUES (?, ?, ?)',
            [name, description || null, yearlyLimit]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Leave type created successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Error creating leave type:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                success: false, 
                message: 'Leave type with this name already exists' 
            });
        }
        res.status(500).json({ success: false, message: 'Failed to create leave type' });
    }
};

/**
 * Update leave type (Admin only)
 */
exports.updateLeaveType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, yearlyLimit, isActive } = req.body;

        const result = await db.query(
            `UPDATE leave_types 
             SET name = COALESCE(?, name),
                 description = COALESCE(?, description),
                 yearlyLimit = COALESCE(?, yearlyLimit),
                 isActive = COALESCE(?, isActive)
             WHERE id = ?`,
            [name, description, yearlyLimit, isActive, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Leave type not found' });
        }

        res.json({ success: true, message: 'Leave type updated successfully' });
    } catch (error) {
        console.error('Error updating leave type:', error);
        res.status(500).json({ success: false, message: 'Failed to update leave type' });
    }
};

/**
 * Get leave balance for a user
 */
exports.getLeaveBalance = async (req, res) => {
    try {
        const userId = req.user?.id || req.params.userId;
        const year = req.query.year || new Date().getFullYear();

        const balances = await db.query(
            `SELECT lb.*, lt.name as leaveTypeName, lt.description
             FROM leave_balances lb
             JOIN leave_types lt ON lb.leaveTypeId = lt.id
             WHERE lb.userId = ? AND lb.year = ?
             ORDER BY lt.name`,
            [userId, year]
        );

        res.json({ success: true, data: balances });
    } catch (error) {
        console.error('Error fetching leave balance:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leave balance' });
    }
};

/**
 * Initialize leave balances for a user for a given year
 */
exports.initializeLeaveBalances = async (req, res) => {
    try {
        const { userId, year } = req.body;

        if (!userId || !year) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID and year are required' 
            });
        }

        // Get all active leave types
        const leaveTypes = await db.query(
            'SELECT id, yearlyLimit FROM leave_types WHERE isActive = 1'
        );

        if (leaveTypes.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No active leave types found' 
            });
        }

        // Insert balances for each leave type
        const values = leaveTypes.map(lt => [userId, lt.id, year, lt.yearlyLimit]);
        
        await db.query(
            `INSERT INTO leave_balances (userId, leaveTypeId, year, yearlyLimit)
             VALUES ?
             ON DUPLICATE KEY UPDATE yearlyLimit = VALUES(yearlyLimit)`,
            [values]
        );

        res.json({ 
            success: true, 
            message: 'Leave balances initialized successfully' 
        });
    } catch (error) {
        console.error('Error initializing leave balances:', error);
        res.status(500).json({ success: false, message: 'Failed to initialize leave balances' });
    }
};

/**
 * Create a leave request
 */
exports.createLeaveRequest = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const userId = req.user?.id || req.body.userId;
        const { leaveTypeId, startDate, endDate, totalDays, reason } = req.body;

        if (!leaveTypeId || !startDate || !endDate || !totalDays) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Leave type, start date, end date, and total days are required' 
            });
        }

        // Extract year from date string (YYYY-MM-DD format)
        const year = parseInt(startDate.split('-')[0], 10);

        // Check if leave balance exists for this year
        const [balanceCheck] = await connection.query(
            'SELECT * FROM leave_balances WHERE userId = ? AND leaveTypeId = ? AND year = ?',
            [userId, leaveTypeId, year]
        );

        if (balanceCheck.length === 0) {
            // Initialize balance if it doesn't exist
            const [leaveType] = await connection.query(
                'SELECT yearlyLimit FROM leave_types WHERE id = ?',
                [leaveTypeId]
            );

            if (leaveType.length === 0) {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid leave type' 
                });
            }

            await connection.query(
                'INSERT INTO leave_balances (userId, leaveTypeId, year, yearlyLimit) VALUES (?, ?, ?, ?)',
                [userId, leaveTypeId, year, leaveType[0].yearlyLimit]
            );
        }

        // Check if user has sufficient balance
        const [balance] = await connection.query(
            'SELECT remaining FROM leave_balances WHERE userId = ? AND leaveTypeId = ? AND year = ?',
            [userId, leaveTypeId, year]
        );

        if (balance.length === 0 || balance[0].remaining < totalDays) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient leave balance',
                available: balance.length > 0 ? balance[0].remaining : 0
            });
        }

        // Create leave request
        const [result] = await connection.query(
            `INSERT INTO leave_requests (userId, leaveTypeId, startDate, endDate, totalDays, reason)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, leaveTypeId, startDate, endDate, totalDays, reason || null]
        );

        // Update leave balance
        await connection.query(
            'UPDATE leave_balances SET used = used + ? WHERE userId = ? AND leaveTypeId = ? AND year = ?',
            [totalDays, userId, leaveTypeId, year]
        );

        await connection.commit();

        res.status(201).json({ 
            success: true, 
            message: 'Leave request created successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating leave request:', error);
        res.status(500).json({ success: false, message: 'Failed to create leave request' });
    } finally {
        connection.release();
    }
};

/**
 * Get leave requests for a user
 */
exports.getLeaveRequests = async (req, res) => {
    try {
        // Check query param first, then route param, then fall back to logged-in user
        const userId = req.query.userId || req.params.userId || req.user?.id;
        const { year, leaveTypeId, startDate, endDate } = req.query;

        let query = `
            SELECT lr.id, lr.userId, lr.leaveTypeId, lr.totalDays, lr.reason,
                   lr.createdAt, lr.updatedAt,
                   DATE_FORMAT(lr.startDate, '%Y-%m-%d') as startDate,
                   DATE_FORMAT(lr.endDate, '%Y-%m-%d') as endDate,
                   lt.name as leaveTypeName, 
                   u.name as userName, u.phone as userPhone
            FROM leave_requests lr
            JOIN leave_types lt ON lr.leaveTypeId = lt.id
            JOIN users u ON lr.userId = u.id
            WHERE lr.userId = ?
        `;
        const params = [userId];

        if (year) {
            query += ' AND YEAR(lr.startDate) = ?';
            params.push(year);
        }

        if (leaveTypeId) {
            query += ' AND lr.leaveTypeId = ?';
            params.push(leaveTypeId);
        }

        if (req.query.startDate) {
            query += ' AND lr.startDate >= ?';
            params.push(req.query.startDate);
        }

        if (req.query.endDate) {
            query += ' AND lr.endDate <= ?';
            params.push(req.query.endDate);
        }

        query += ' ORDER BY lr.startDate DESC, lr.createdAt DESC';

        const requests = await db.query(query, params);

        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leave requests' });
    }
};

/**
 * Get all leave requests (Admin/Manager view)
 */
exports.getAllLeaveRequests = async (req, res) => {
    try {
        const { year, leaveTypeId, userId, startDate, endDate } = req.query;

        let query = `
            SELECT lr.id, lr.userId, lr.leaveTypeId, lr.totalDays, lr.reason,
                   lr.createdAt, lr.updatedAt,
                   DATE_FORMAT(lr.startDate, '%Y-%m-%d') as startDate,
                   DATE_FORMAT(lr.endDate, '%Y-%m-%d') as endDate,
                   lt.name as leaveTypeName, 
                   u.name as userName, u.phone as userPhone, u.designation_id
            FROM leave_requests lr
            JOIN leave_types lt ON lr.leaveTypeId = lt.id
            JOIN users u ON lr.userId = u.id
            WHERE 1=1
        `;
        const params = [];

        if (year) {
            query += ' AND YEAR(lr.startDate) = ?';
            params.push(year);
        }

        if (leaveTypeId) {
            query += ' AND lr.leaveTypeId = ?';
            params.push(leaveTypeId);
        }

        if (userId) {
            query += ' AND lr.userId = ?';
            params.push(userId);
        }

        if (req.query.startDate) {
            query += ' AND lr.startDate >= ?';
            params.push(req.query.startDate);
        }

        if (req.query.endDate) {
            query += ' AND lr.endDate <= ?';
            params.push(req.query.endDate);
        }

        query += ' ORDER BY lr.startDate DESC, lr.createdAt DESC';

        const requests = await db.query(query, params);

        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Error fetching all leave requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leave requests' });
    }
};

/**
 * Delete a leave request (cancel leave)
 */
exports.deleteLeaveRequest = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const userId = req.user?.id;

        // Get leave request details
        const [leaveRequest] = await connection.query(
            'SELECT * FROM leave_requests WHERE id = ?',
            [id]
        );

        if (leaveRequest.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Leave request not found' });
        }

        // Check if user owns this request (unless admin)
        if (userId && leaveRequest[0].userId !== userId && req.user?.designation_id !== 4) {
            await connection.rollback();
            return res.status(403).json({ 
                success: false, 
                message: 'Not authorized to delete this leave request' 
            });
        }

        const { userId: requestUserId, leaveTypeId, totalDays, startDate } = leaveRequest[0];
        const year = new Date(startDate).getFullYear();

        // Delete leave request
        await connection.query('DELETE FROM leave_requests WHERE id = ?', [id]);

        // Restore leave balance
        await connection.query(
            'UPDATE leave_balances SET used = used - ? WHERE userId = ? AND leaveTypeId = ? AND year = ?',
            [totalDays, requestUserId, leaveTypeId, year]
        );

        await connection.commit();

        res.json({ success: true, message: 'Leave request cancelled successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting leave request:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel leave request' });
    } finally {
        connection.release();
    }
};

/**
 * Get leave summary for dashboard
 */
exports.getLeaveSummary = async (req, res) => {
    try {
        const userId = req.user?.id || req.params.userId;
        const year = req.query.year || new Date().getFullYear();

        const summary = await db.query(
            `SELECT 
                COUNT(DISTINCT lb.leaveTypeId) as totalLeaveTypes,
                SUM(lb.yearlyLimit) as totalAllowedDays,
                SUM(lb.used) as totalUsedDays,
                SUM(lb.remaining) as totalRemainingDays,
                COUNT(DISTINCT lr.id) as totalRequests
             FROM leave_balances lb
             JOIN leave_types lt ON lb.leaveTypeId = lt.id AND lt.isActive = 1
             LEFT JOIN leave_requests lr ON lb.userId = lr.userId 
                 AND lb.leaveTypeId = lr.leaveTypeId 
                 AND YEAR(lr.startDate) = lb.year
             WHERE lb.userId = ? AND lb.year = ?`,
            [userId, year]
        );

        res.json({ success: true, data: summary[0] || {} });
    } catch (error) {
        console.error('Error fetching leave summary:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leave summary' });
    }
};

