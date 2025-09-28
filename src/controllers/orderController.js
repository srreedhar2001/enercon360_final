const { query: dbQuery } = require('../config/database');
const invoiceService = require('../services/invoiceService');

class OrderController {
    // Aggregate outstanding dues per counter, optional filter by representative
    async getDuesByCounter(req, res) {
        try {
            const { repId, month } = req.query;

            let where = ' WHERE 1=1 ';
            if (repId) {
                where += ' AND c.RepID = ? ';
            }

            // Validate month if provided
            let monthFilter = null;
            if (month) {
                const m = String(month).trim();
                if (/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) {
                    monthFilter = m;
                } else {
                    return res.status(400).json({ success: false, message: 'Invalid month format. Use YYYY-MM' });
                }
            }

            const sql = `
                SELECT 
                    c.id AS counterId,
                    c.CounterName AS counterName,
                    c.RepID AS repId,
                    c.openingBalance AS openingBalance,
                    c.collectionTarget AS collectionTarget,
                    u.name AS repName,
                    u.phone AS repMobile,
                    COALESCE(COUNT(DISTINCT o.id), 0) AS orderCount,
                    COALESCE(ROUND(SUM(COALESCE(o.grandTotal,0))), 0) AS totalGrand,
                    COALESCE(ROUND(SUM(LEAST(COALESCE(col.totalCollected,0), COALESCE(o.grandTotal,0)))), 0) AS totalCollected,
                    COALESCE(ROUND(SUM(GREATEST(COALESCE(o.grandTotal,0) - LEAST(COALESCE(col.totalCollected,0), COALESCE(o.grandTotal,0)), 0))), 0) AS totalDue,
                                        (
                                                SELECT COALESCE(ROUND(SUM(COALESCE(cx.amount,0))), 0)
                                                FROM collections cx
                                                INNER JOIN orders o2 ON o2.id = cx.orderID
                                                WHERE o2.counterID = c.id
                                                    AND DATE_FORMAT(cx.transactionDate, '%Y-%m') = ${monthFilter ? ' ? ' : 'DATE_FORMAT(CURDATE(), "%Y-%m")'}
                                        ) AS monthlyCollected,
                    DATE_FORMAT(MAX(o.orderDate), '%Y-%m-%d') AS latestOrderDate
                FROM counters c
                LEFT JOIN users u ON c.RepID = u.id
                LEFT JOIN orders o ON o.counterID = c.id
                LEFT JOIN (
                    SELECT orderID, SUM(amount) AS totalCollected
                    FROM collections
                    GROUP BY orderID
                ) col ON col.orderID = o.id
                ${where}
                GROUP BY c.id, c.CounterName, c.RepID, c.openingBalance, c.collectionTarget, u.name, u.phone
                HAVING totalDue > 0
                ORDER BY totalDue DESC, c.CounterName ASC
            `;

            // Bind params in SQL placeholder order: monthlyCollected (if any) appears before WHERE repId
            const paramsOrdered = [];
            if (monthFilter) paramsOrdered.push(monthFilter);
            if (repId) paramsOrdered.push(repId);
            const rows = await dbQuery(sql, paramsOrdered);
            return res.status(200).json({ success: true, message: 'Dues by counter fetched', data: rows, count: rows.length, meta: { repId: repId ? Number(repId) : null, month: monthFilter } });
        } catch (error) {
            console.error('Error fetching dues by counter:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch dues by counter', error: error.message });
        }
    }
    // Get last 12 months totals for orders where the counter was created in that same month (for a representative)
    async getRepMonthNewCountersTotals(req, res) {
        try {
            const { repId } = req.query;
            if (!repId) {
                return res.status(400).json({ success: false, message: 'repId is required' });
            }

            // Determine available timestamp column to fall back on when counters.createdDate is NULL
            const colCheck = await dbQuery(`
                SELECT COLUMN_NAME AS name
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'counters' AND COLUMN_NAME IN ('createdAt','created_at')
            `);
            let fallbackCol = null;
            if (Array.isArray(colCheck) && colCheck.length) {
                const names = colCheck.map(r => r.name);
                fallbackCol = names.includes('createdAt') ? 'createdAt' : (names.includes('created_at') ? 'created_at' : null);
            }
            const dateExpr = fallbackCol ? `COALESCE(c.createdDate, DATE(c.${fallbackCol}))` : `c.createdDate`;

            const sql = `
                                SELECT 
                                        DATE_FORMAT(o.orderDate, '%Y-%m') AS ym,
                                        DATE_FORMAT(o.orderDate, '%b %Y') AS label,
                                        COALESCE(SUM(COALESCE(o.grandTotal,0)), 0) AS netTotal,
                                        COUNT(*) AS orderCount
                                FROM orders o
                                INNER JOIN counters c ON o.counterID = c.id
                INNER JOIN users u ON c.RepID = u.id
                WHERE u.id = ?
                  AND u.designation_id = 2
                  AND ${dateExpr} IS NOT NULL
                  AND DATE_FORMAT(${dateExpr}, '%Y-%m') = DATE_FORMAT(o.orderDate, '%Y-%m')
                                    AND o.orderDate >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
                                GROUP BY ym, label
                                ORDER BY ym ASC
                        `;
                                    const rows = await dbQuery(sql, [repId]);

                                    // Also fetch how many counters were created per month for this rep (independent of orders)
                                    const countersCountSql = `
                                            SELECT DATE_FORMAT(${dateExpr}, '%Y-%m') AS ym, COUNT(*) AS cnt
                                            FROM counters c
                                            INNER JOIN users u ON c.RepID = u.id
                                            WHERE u.id = ?
                                                AND u.designation_id = 2
                                                AND ${dateExpr} >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
                                            GROUP BY ym
                                    `;
                                    const countersRows = await dbQuery(countersCountSql, [repId]);
                                    const countersMap = Object.fromEntries(countersRows.map(r => [r.ym, Number(r.cnt) || 0]));

            // Build a complete 12-month series including months with 0
            const now = new Date();
            const series = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
                d.setUTCMonth(d.getUTCMonth() - i);
                const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                series.push({ ym, label, total: 0, netTotal: 0, orderCount: 0 });
            }
            const map = Object.fromEntries(rows.map(r => [r.ym, r]));
            const data = series.map(m => {
                const r = map[m.ym];
                return {
                    ym: m.ym,
                    label: m.label,
                    total: Number(r?.netTotal || 0),
                    netTotal: Number(r?.netTotal || 0),
                    orderCount: Number(r?.orderCount || 0),
                    countersCreatedCount: countersMap[m.ym] || 0
                };
            });

            return res.status(200).json({ success: true, message: 'Rep new-counters monthly totals fetched', data, meta: { repId: Number(repId) } });
        } catch (error) {
            console.error('Error fetching rep new-counters monthly totals:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch rep new-counters monthly totals', error: error.message });
        }
    }

    // Get orders for a representative for a specific month where counter was created in that same month
    async getRepMonthOrdersForNewCounters(req, res) {
        try {
            const { repId, ym } = req.query;
            if (!repId || !ym || !/^\d{4}-\d{2}$/.test(String(ym))) {
                return res.status(400).json({ success: false, message: 'repId and valid ym (YYYY-MM) are required' });
            }

            const colCheck = await dbQuery(`
                SELECT COLUMN_NAME AS name
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'counters' AND COLUMN_NAME IN ('createdAt','created_at')
            `);
            let fallbackCol = null;
            if (Array.isArray(colCheck) && colCheck.length) {
                const names = colCheck.map(r => r.name);
                fallbackCol = names.includes('createdAt') ? 'createdAt' : (names.includes('created_at') ? 'created_at' : null);
            }
            const dateExpr = fallbackCol ? `COALESCE(c.createdDate, DATE(c.${fallbackCol}))` : `c.createdDate`;

            const sql = `
                                SELECT 
                                        o.id,
                                        DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
                                        o.counterID,
                                        c.CounterName AS counterName,
                                        o.grandTotal,
                                        o.paymentReceived,
                                        o.invoiceFileName
                                FROM orders o
                                INNER JOIN counters c ON o.counterID = c.id
                INNER JOIN users u ON c.RepID = u.id
                WHERE u.id = ?
                  AND u.designation_id = 2
                  AND ${dateExpr} IS NOT NULL
                  AND DATE_FORMAT(${dateExpr}, '%Y-%m') = ?
                                    AND DATE_FORMAT(o.orderDate, '%Y-%m') = ?
                                ORDER BY o.orderDate DESC, o.id DESC
                        `;
                        const rows = await dbQuery(sql, [repId, ym, ym]);
            return res.status(200).json({ success: true, message: 'Orders for month (new counters) fetched', data: rows, count: rows.length, meta: { repId: Number(repId), ym } });
        } catch (error) {
            console.error('Error fetching orders for new counters month:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch orders for new counters month', error: error.message });
        }
    }
    // Get last 12 months order totals (including current month)
    async getLastSixMonthsTotals(req, res) {
        try {
            const { repId } = req.query;
            // Fetch summed totals by year-month from DB for the last 12 months
            let sql = `
                SELECT 
                    DATE_FORMAT(o.orderDate, '%Y-%m') AS ym,
                    DATE_FORMAT(o.orderDate, '%b %Y') AS label,
                    COALESCE(SUM(COALESCE(o.subTotal,0) + COALESCE(o.totalCGST,0) + COALESCE(o.totalSGST,0)), 0) AS grossTotal,
                    COALESCE(SUM(COALESCE(o.grandTotal,0)), 0) AS netTotal,
                    (
                        SELECT COALESCE(ROUND(SUM((COALESCE(od.qty,0) + COALESCE(od.freeQty,0)) * COALESCE(p.manufacturingPrice,0))), 0)
                        FROM orders o2
                        LEFT JOIN orderdetails od ON od.orderId = o2.id
                        LEFT JOIN product p ON p.id = od.productId
                        ${repId ? 'INNER JOIN counters c2 ON o2.counterID = c2.id' : ''}
                        WHERE DATE_FORMAT(o2.orderDate, '%Y-%m') = DATE_FORMAT(o.orderDate, '%Y-%m')
                        ${repId ? 'AND c2.RepID = ?' : ''}
                    ) AS productCost
                FROM orders o
            `;
            const params = [];
            if (repId) {
                sql += ` INNER JOIN counters c ON o.counterID = c.id `;
            }
            sql += ` WHERE o.orderDate >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH) `;
            if (repId) {
                sql += ` AND c.RepID = ? `;
                // First for subquery (c2.RepID), second for main filter (c.RepID)
                params.push(repId, repId);
            }
            sql += ` GROUP BY ym, label ORDER BY ym ASC `;

            const rows = await dbQuery(sql, params);

            // Build a complete 12-month series including months with 0 total
            const now = new Date();
            const series = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
                d.setUTCMonth(d.getUTCMonth() - i);
                const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                series.push({ ym, label, total: 0 });
            }

            const grossMap = Object.fromEntries(rows.map(r => [r.ym, Number(r.grossTotal) || 0]));
            const netMap = Object.fromEntries(rows.map(r => [r.ym, Number(r.netTotal) || 0]));
            const costMap = Object.fromEntries(rows.map(r => [r.ym, Number(r.productCost) || 0]));
            const data = series.map(m => {
                const gross = Math.round(grossMap[m.ym] || 0);
                const net = Math.round(netMap[m.ym] || 0);
                const discount = Math.max(gross - net, 0);
                return { ...m, grossTotal: gross, netTotal: net, discountTotal: discount, total: gross, productCost: Math.round(costMap[m.ym] || 0) };
            });

            return res.status(200).json({
                success: true,
                message: 'Last 6 months totals fetched',
                data
            });
        } catch (error) {
            console.error('Error fetching last 6 months totals:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch last 6 months totals',
                error: error.message
            });
        }
    }

    // Get per-counter totals for a representative for a given month (ym = YYYY-MM)
    async getRepMonthCounterTotals(req, res) {
        try {
            const { repId, ym } = req.query;
            if (!repId || !ym) {
                return res.status(400).json({ success: false, message: 'repId and ym (YYYY-MM) are required' });
            }

            // Validate ym format
            const ymMatch = String(ym).match(/^(\d{4})-(\d{2})$/);
            if (!ymMatch) {
                return res.status(400).json({ success: false, message: 'Invalid ym format. Use YYYY-MM' });
            }

            // Query: all counters of rep with LEFT JOIN orders for that month
            const sql = `
                SELECT 
                    c.id AS counterId,
                    c.CounterName AS counterName,
                    COALESCE(COUNT(DISTINCT o.id), 0) AS orderCount,
                    COALESCE(COUNT(DISTINCT CASE WHEN o.paymentReceived = 1 THEN o.id END), 0) AS paidCount,
                    COALESCE(COUNT(DISTINCT CASE WHEN o.paymentReceived = 0 THEN o.id END), 0) AS unpaidCount,
                    DATE_FORMAT(MAX(o.orderDate), '%Y-%m-%d') AS latestOrderDate,
                    COALESCE(ROUND(SUM((COALESCE(o.subTotal,0) - COALESCE(o.TotalDiscountAmount,0)) 
                        + COALESCE(o.totalCGST,0) + COALESCE(o.totalSGST,0))), 0) AS total,
                    COALESCE(ROUND(SUM(CASE WHEN o.paymentReceived = 0 THEN ((COALESCE(o.subTotal,0) - COALESCE(o.TotalDiscountAmount,0)) + COALESCE(o.totalCGST,0) + COALESCE(o.totalSGST,0)) ELSE 0 END)), 0) AS pendingTotal,
                    (
                        SELECT COALESCE(ROUND(SUM((COALESCE(od.qty,0) + COALESCE(od.freeQty,0)) * COALESCE(p.manufacturingPrice,0))), 0)
                        FROM orders o2
                        LEFT JOIN orderdetails od ON od.orderId = o2.id
                        LEFT JOIN product p ON p.id = od.productId
                        WHERE o2.counterID = c.id AND DATE_FORMAT(o2.orderDate, '%Y-%m') = ?
                    ) AS productCost
                FROM counters c
                LEFT JOIN orders o 
                    ON o.counterID = c.id 
                    AND DATE_FORMAT(o.orderDate, '%Y-%m') = ?
                WHERE c.RepID = ?
                GROUP BY c.id, c.CounterName
                ORDER BY total DESC, c.CounterName ASC
            `;

            const rows = await dbQuery(sql, [ym, ym, repId]);

            return res.status(200).json({
                success: true,
                message: 'Counter totals for representative and month fetched',
                data: rows,
                meta: { repId: Number(repId), ym }
            });
        } catch (error) {
            console.error('Error fetching rep-month counter totals:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch rep-month counter totals',
                error: error.message
            });
        }
    }
    // Lightweight fetch: orders for specific months (summary only, no line items)
    async getOrdersByMonths(req, res) {
        try {
            const { months, payment, counterId, search, repId } = req.query; // removed status (column absent)
            if (!months) {
                return res.status(400).json({ success: false, message: 'months query param required (comma separated YYYY-MM values)' });
            }
            // Parse and validate months
            let monthList = String(months).split(',').map(m => m.trim()).filter(Boolean);
            monthList = Array.from(new Set(monthList)); // dedupe
            if (monthList.length === 0) {
                return res.status(400).json({ success: false, message: 'No valid months supplied' });
            }
            const ymRegex = /^(\d{4})-(0[1-9]|1[0-2])$/;
            for (const ym of monthList) {
                if (!ymRegex.test(ym)) {
                    return res.status(400).json({ success: false, message: `Invalid month format: ${ym}` });
                }
            }

            // Build SQL
            const params = [];
            const placeholders = monthList.map(_ => '?').join(',');
            let sql = `
                SELECT 
                    o.id,
                    DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
                    o.counterID,
                    c.CounterName AS counterName,
                    o.subTotal,
                    o.totalCGST,
                    o.totalSGST,
                    o.TotalDiscountAmount,
                    o.grandTotal,
                    o.paymentReceived,
                    (
                        SELECT COALESCE(SUM(c.amount), 0)
                        FROM collections c
                        WHERE c.orderID = o.id
                    ) AS collectedTotal,
                    o.invoiceFileName,
                    (SELECT COUNT(*) FROM orderdetails od WHERE od.orderId = o.id) AS itemCount,
                    (SELECT COALESCE(SUM(od.qty),0) FROM orderdetails od WHERE od.orderId = o.id) AS totalQuantity
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
            `;
            if (repId) {
                sql += ' LEFT JOIN counters cr ON o.counterID = cr.id ';
            }
            sql += ` WHERE DATE_FORMAT(o.orderDate, '%Y-%m') IN (${placeholders})`;
            params.push(...monthList);
            // status filtering skipped (orders.status column not present in current schema)
            if (payment === '0' || payment === '1') {
                sql += ' AND o.paymentReceived = ?';
                params.push(payment);
            }
            if (counterId) {
                sql += ' AND o.counterID = ?';
                params.push(counterId);
            }
            if (repId) {
                sql += ' AND cr.RepID = ?';
                params.push(repId);
            }
            if (search) {
                sql += ' AND (o.id LIKE ? OR c.CounterName LIKE ? OR o.invoiceFileName LIKE ?)';
                const like = `%${search}%`;
                params.push(like, like, like);
            }
            sql += ' ORDER BY o.orderDate DESC, o.id DESC';

            const rows = await dbQuery(sql, params);
            // Add fallback status field for UI compatibility
            const data = rows.map(r => ({ ...r, status: r.status || 'open' }));
            return res.status(200).json({
                success: true,
                message: 'Monthly orders (summary) fetched',
                data,
                count: data.length,
                meta: { months: monthList }
            });
        } catch (error) {
            console.error('Error fetching orders by months (summary):', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch monthly orders', error: error.message });
        }
    }
    // Get all orders with order details
    async getAllOrders(req, res) {
        try {
            const { status } = req.query;
            
            // Build the query based on status filter
            let query = `
                SELECT 
                    o.*,
                    DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
                    c.CounterName as counterName,
                    c.phone as counterPhone,
                    c.address as counterAddress,
                    city.city as counterCity,
                    city.district as counterDistrict,
                    city.state as counterState,
                    u.name as userName
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON o.user_id = u.id
            `;
            
            let queryParams = [];
            
            // Add WHERE clause for status filtering
            if (status && status !== 'all') {
                query += ` WHERE o.status = ?`;
                queryParams.push(status);
            }
            
            query += ` ORDER BY o.orderDate DESC, o.id DESC`;
            
            const orders = await dbQuery(query, queryParams);
            
            // Get order details for each order
            for (let order of orders) {
                const orderDetailsQuery = `
                    SELECT 
                        od.*,
                        p.name as productName,
                        p.sku as productSku,
                        p.description as productDescription
                    FROM orderdetails od
                    LEFT JOIN product p ON od.productId = p.id
                    WHERE od.orderId = ?
                    ORDER BY od.id
                `;
                
                const orderDetails = await dbQuery(orderDetailsQuery, [order.id]);
                order.orderDetails = orderDetails;
                order.itemCount = orderDetails.length;
                order.totalQuantity = orderDetails.reduce((sum, item) => sum + (item.qty || 0), 0);
            }
            
            return res.status(200).json({
                success: true,
                message: 'Orders retrieved successfully',
                data: orders,
                count: orders.length
            });
            
        } catch (error) {
            console.error('Error fetching orders:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
                error: error.message
            });
        }
    }

    // Get order by ID with details
    async getOrderById(req, res) {
        try {
            const { id } = req.params;
            
            const orderQuery = `
                SELECT 
                    o.*,
                    DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
                    c.CounterName as counterName,
                    c.phone as counterPhone,
                    c.address as counterAddress,
                    city.city as counterCity,
                    city.district as counterDistrict,
                    city.state as counterState,
                    u.name as userName
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.id = ?
            `;
            
            const orders = await dbQuery(orderQuery, [id]);
            
            if (orders.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            
            const order = orders[0];
            
            // Get order details
            const orderDetailsQuery = `
                SELECT 
                    od.*,
                    p.name as productName,
                    p.sku as productSku,
                    p.description as productDescription
                FROM orderdetails od
                LEFT JOIN product p ON od.productId = p.id
                WHERE od.orderId = ?
                ORDER BY od.id
            `;
            
            const orderDetails = await dbQuery(orderDetailsQuery, [id]);
            order.orderDetails = orderDetails;
            order.itemCount = orderDetails.length;
            order.totalQuantity = orderDetails.reduce((sum, item) => sum + (item.qty || 0), 0);
            
            return res.status(200).json({
                success: true,
                message: 'Order retrieved successfully',
                data: order
            });
            
        } catch (error) {
            console.error('Error fetching order:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch order',
                error: error.message
            });
        }
    }

    // Create new order
    async createOrder(req, res) {
        try {
            const {
                counterID,
                orderDate,
                subTotal,
                totalCGST,
                totalSGST,
                grandTotal,
                paymentReceived,
                orderDetails
            } = req.body;

            // Validation
            if (!counterID || !orderDetails || !Array.isArray(orderDetails) || orderDetails.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: counterID and orderDetails array'
                });
            }

            // Validate counter exists
            const counterCheck = await dbQuery('SELECT id FROM counters WHERE id = ?', [counterID]);
            if (counterCheck.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid counter ID'
                });
            }

            // Create order (initialize TotalDiscountAmount as 0; will update after inserting details)
            const orderQuery = `
                INSERT INTO orders (
                    counterID, orderDate, subTotal, totalCGST, totalSGST, TotalDiscountAmount,
                    grandTotal, paymentReceived, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;
            
            const orderResult = await dbQuery(orderQuery, [
                counterID,
                orderDate || new Date().toISOString().split('T')[0],
                subTotal || 0,
                totalCGST || 0,
                totalSGST || 0,
                0, // TotalDiscountAmount initial
                grandTotal || 0,
                paymentReceived || 0
            ]);

            const orderId = orderResult.insertId;

            // Create order details and accumulate total discount
            // Also aggregate quantities per product to decrement stock after creation
            let totalDiscountAmountSum = 0;
            const productQtyToReduce = new Map(); // productId -> total units (qty + freeQty)
            for (const detail of orderDetails) {
                // Normalize numeric fields so that 0 is preserved and undefined/NaN become 0
                const qtyParsed = parseInt(detail.quantity ?? detail.qty, 10);
                const safeQty = Number.isFinite(qtyParsed) ? qtyParsed : 0;
                const freeQtyParsed = parseInt(detail.freeQty, 10);
                const safeFreeQty = Number.isFinite(freeQtyParsed) ? freeQtyParsed : 0;
                const rateParsed = Number(detail.rate);
                const safeRate = Number.isFinite(rateParsed) ? rateParsed : 0;
                const totalAmountParsed = Number(detail.totalAmount);
                const safeTotalAmount = Number.isFinite(totalAmountParsed) ? totalAmountParsed : 0;
                const cgstParsed = Number(detail.cgst);
                const safeCgst = Number.isFinite(cgstParsed) ? cgstParsed : 0;
                const sgstParsed = Number(detail.sgst);
                const safeSgst = Number.isFinite(sgstParsed) ? sgstParsed : 0;
                const discountParsed = Number(detail.discount);
                const safeDiscount = Number.isFinite(discountParsed) ? discountParsed : 0;
                const productId = detail.productID ?? detail.productId;
                // Compute discount amount from qty * rate and percentage, using whole-rupee rounding policy
                const lineSubtotal = Math.round(safeQty * safeRate);
                const discountAmountRaw = lineSubtotal * (safeDiscount / 100);
                const safeDiscountAmount = Math.round(discountAmountRaw);
                const detailQuery = `
                    INSERT INTO orderdetails (
                        orderId, productId, qty, freeQty, offerPrice, total, 
                        cgst, sgst, discount, DiscountAmount, createdAt, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `;
                
                await dbQuery(detailQuery, [
                    orderId,
                    productId,
                    safeQty,
                    safeFreeQty,
                    safeRate,
                    safeTotalAmount,
                    safeCgst,
                    safeSgst,
                    safeDiscount, // percentage
                    safeDiscountAmount
                ]);
                totalDiscountAmountSum += safeDiscountAmount;

                // Accumulate quantity to reduce from product stock (qty + freeQty consume inventory)
                if (Number.isFinite(Number(productId))) {
                    const reduceBy = Math.max(0, (safeQty || 0) + (safeFreeQty || 0));
                    if (reduceBy > 0) {
                        productQtyToReduce.set(
                            Number(productId),
                            (productQtyToReduce.get(Number(productId)) || 0) + reduceBy
                        );
                    }
                }
            }

            // Update order header with total discount amount and corrected grand total
            const totalDiscountRounded = Math.round(totalDiscountAmountSum) || 0;
            await dbQuery('UPDATE orders SET TotalDiscountAmount = ?, grandTotal = ROUND((COALESCE(subTotal,0) - ?) + COALESCE(totalCGST,0) + COALESCE(totalSGST,0)) WHERE id = ?', [
                totalDiscountRounded,
                totalDiscountRounded,
                orderId
            ]);

            // Decrement product stock for each product in the order
            // Note: We clamp to zero to avoid negative inventory. For stricter control, add pre-checks and transactions.
            for (const [pid, reduceBy] of productQtyToReduce.entries()) {
                try {
                    await dbQuery(
                        'UPDATE product SET qty = GREATEST(COALESCE(qty,0) - ?, 0), updated_at = NOW() WHERE id = ?',
                        [reduceBy, pid]
                    );
                } catch (invErr) {
                    console.error(`Failed to decrement stock for product ${pid} by ${reduceBy}:`, invErr);
                    // Continue without failing the whole order creation
                }
            }

            // Fetch the created order with all details - simplified approach
            const fetchOrderQuery = `
                SELECT 
                    o.*,
                    DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
                    c.CounterName as counterName,
                    c.phone as counterPhone,
                    c.address as counterAddress,
                    city.city as counterCity,
                    city.district as counterDistrict,
                    city.state as counterState,
                    u.name as userName
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.id = ?
            `;
            
            const orders = await dbQuery(fetchOrderQuery, [orderId]);
            const newOrderData = orders[0];
            
            if (newOrderData) {
                const orderDetailsQuery = `
                    SELECT 
                        od.*,
                        p.name as productName,
                        p.sku as productSku,
                        p.description as productDescription
                    FROM orderdetails od
                    LEFT JOIN product p ON od.productId = p.id
                    WHERE od.orderId = ?
                    ORDER BY od.id
                `;
                
                const orderDetails = await dbQuery(orderDetailsQuery, [orderId]);
                newOrderData.orderDetails = orderDetails;
                newOrderData.itemCount = orderDetails.length;
                newOrderData.totalQuantity = orderDetails.reduce((sum, item) => sum + (item.qty || 0), 0);
            }

            // Generate invoice
            let invoiceInfo = null;
            try {
                // Get counter information for invoice
                const counterQuery = `
                    SELECT c.*, city.city, city.state 
                    FROM counters c 
                    LEFT JOIN city ON c.CityID = city.id 
                    WHERE c.id = ?
                `;
                const counterResult = await dbQuery(counterQuery, [newOrderData.counterID]);
                const counter = counterResult[0] || {};

                // Prepare invoice data
                const invoiceData = {
                    order: newOrderData,
                    orderDetails: newOrderData.orderDetails,
                    counter: counter
                };

                // Generate invoice file
                invoiceInfo = await invoiceService.generateInvoiceFile(invoiceData);
                
                // Update order with invoice filename
                await dbQuery(
                    'UPDATE orders SET invoiceFileName = ? WHERE id = ?', 
                    [invoiceInfo.fileName, orderId]
                );
                
                newOrderData.invoiceFileName = invoiceInfo.fileName;
                newOrderData.invoiceUrl = invoiceInfo.url;
                
            } catch (invoiceError) {
                console.error('Error generating invoice:', invoiceError);
                // Don't fail the order creation if invoice generation fails
            }

            return res.status(201).json({
                success: true,
                message: 'Order and invoice created successfully',
                data: newOrderData,
                invoice: invoiceInfo
            });

        } catch (error) {
            console.error('Error creating order:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create order',
                error: error.message
            });
        }
    }

    // Update order (header + optional line items)
    async updateOrder(req, res) {
        try {
            const { id } = req.params;
            const {
                counterID,
                orderDate,
                subTotal,
                totalCGST,
                totalSGST,
                grandTotal,
                paymentReceived,
                orderDetails
            } = req.body;

            // Check if order exists
            const existingOrder = await dbQuery('SELECT id FROM orders WHERE id = ?', [id]);
            if (existingOrder.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Basic header update first (TotalDiscountAmount will be recomputed below if details are provided)
            const updateQuery = `
                UPDATE orders SET 
                    counterID = ?, orderDate = ?, subTotal = ?, totalCGST = ?, 
                    totalSGST = ?, grandTotal = ?, paymentReceived = ?, updatedAt = NOW()
                WHERE id = ?
            `;

            await dbQuery(updateQuery, [
                counterID ?? null,
                orderDate ?? null,
                subTotal ?? 0,
                totalCGST ?? 0,
                totalSGST ?? 0,
                grandTotal ?? 0,
                paymentReceived ?? 0,
                id
            ]);

            // If orderDetails provided, replace them
            if (Array.isArray(orderDetails)) {
                // Delete existing details
                await dbQuery('DELETE FROM orderdetails WHERE orderId = ?', [id]);

                // Insert new details
                let totalDiscountAmountSumUpd = 0;
                for (const detail of orderDetails) {
                    // Normalize numeric fields so that 0 is preserved and undefined/NaN become 0
                    const qtyParsed = parseInt(detail.quantity ?? detail.qty, 10);
                    const safeQty = Number.isFinite(qtyParsed) ? qtyParsed : 0;
                    const freeQtyParsed = parseInt(detail.freeQty, 10);
                    const safeFreeQty = Number.isFinite(freeQtyParsed) ? freeQtyParsed : 0;
                    const rateParsed = Number(detail.rate ?? detail.offerPrice);
                    const safeRate = Number.isFinite(rateParsed) ? rateParsed : 0;
                    const totalAmountParsed = Number(detail.totalAmount ?? detail.amount);
                    const safeTotalAmount = Number.isFinite(totalAmountParsed) ? totalAmountParsed : 0;
                    const cgstParsed = Number(detail.cgst);
                    const safeCgst = Number.isFinite(cgstParsed) ? cgstParsed : 0;
                    const sgstParsed = Number(detail.sgst);
                    const safeSgst = Number.isFinite(sgstParsed) ? sgstParsed : 0;
                    const discountParsed = Number(detail.discount);
                    const safeDiscount = Number.isFinite(discountParsed) ? discountParsed : 0;
                    const lineSubtotal = Math.round(safeQty * safeRate);
                    const discountAmountRaw = lineSubtotal * (safeDiscount / 100);
                    const safeDiscountAmount = Math.round(discountAmountRaw);
                    const detailQuery = `
                        INSERT INTO orderdetails (
                            orderId, productId, qty, freeQty, offerPrice, total, 
                            cgst, sgst, discount, DiscountAmount, createdAt, updatedAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    `;
                    await dbQuery(detailQuery, [
                        id,
                        detail.productID || detail.productId,
                        safeQty,
                        safeFreeQty,
                        safeRate,
                        safeTotalAmount,
                        safeCgst,
                        safeSgst,
                        safeDiscount,
                        safeDiscountAmount
                    ]);
                    totalDiscountAmountSumUpd += safeDiscountAmount;
                }

                // Update header with recomputed total discount and corrected grand total
                const updDisc = Math.round(totalDiscountAmountSumUpd) || 0;
                await dbQuery('UPDATE orders SET TotalDiscountAmount = ?, grandTotal = ROUND((COALESCE(subTotal,0) - ?) + COALESCE(totalCGST,0) + COALESCE(totalSGST,0)), updatedAt = NOW() WHERE id = ?', [
                    updDisc,
                    updDisc,
                    id
                ]);
            } else {
                // No line changes: derive discount from header fields if possible
                const sub = Number(subTotal || 0);
                const tax = Number(totalCGST || 0) + Number(totalSGST || 0);
                const grand = Number(grandTotal || 0);
                const derivedDisc = Math.max(0, Math.round((sub + tax) - grand));
                await dbQuery('UPDATE orders SET TotalDiscountAmount = ?, updatedAt = NOW() WHERE id = ?', [
                    derivedDisc,
                    id
                ]);
            }

            // Fetch updated order - simplified approach
            const fetchUpdatedOrderQuery = `
                SELECT 
                    o.*,
                    DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
                    c.CounterName as counterName,
                    c.phone as counterPhone,
                    c.address as counterAddress,
                    city.city as counterCity,
                    city.district as counterDistrict,
                    city.state as counterState,
                    u.name as userName
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.id = ?
            `;
            
            const orders = await dbQuery(fetchUpdatedOrderQuery, [id]);
            const updatedOrderData = orders[0];
            
            if (updatedOrderData) {
                const orderDetailsQuery = `
                    SELECT 
                        od.*,
                        p.name as productName,
                        p.sku as productSku,
                        p.description as productDescription
                    FROM orderdetails od
                    LEFT JOIN product p ON od.productId = p.id
                    WHERE od.orderId = ?
                    ORDER BY od.id
                `;
                
                const orderDetails = await dbQuery(orderDetailsQuery, [id]);
                updatedOrderData.orderDetails = orderDetails;
                updatedOrderData.itemCount = orderDetails.length;
                updatedOrderData.totalQuantity = orderDetails.reduce((sum, item) => sum + (item.qty || 0), 0);
            }

            // Generate fresh invoice after update
            let invoiceInfo = null;
            try {
                // Get counter information for invoice
                const counterQuery = `
                    SELECT c.*, city.city, city.state 
                    FROM counters c 
                    LEFT JOIN city ON c.CityID = city.id 
                    WHERE c.id = ?
                `;
                const counterResult = await dbQuery(counterQuery, [updatedOrderData.counterID]);
                const counter = counterResult[0] || {};

                const invoiceData = {
                    order: updatedOrderData,
                    orderDetails: updatedOrderData.orderDetails || [],
                    counter
                };

                invoiceInfo = await invoiceService.generateInvoiceFile(invoiceData);

                await dbQuery(
                    'UPDATE orders SET invoiceFileName = ?, updatedAt = NOW() WHERE id = ?',
                    [invoiceInfo.fileName, id]
                );

                updatedOrderData.invoiceFileName = invoiceInfo.fileName;
                updatedOrderData.invoiceUrl = invoiceInfo.url;
            } catch (invoiceError) {
                console.error('Error generating invoice on update:', invoiceError);
                // Do not fail the update if invoice generation fails
            }

            return res.status(200).json({
                success: true,
                message: 'Order updated successfully',
                data: updatedOrderData,
                invoice: invoiceInfo
            });

        } catch (error) {
            console.error('Error updating order:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update order',
                error: error.message
            });
        }
    }

    // Delete order
    async deleteOrder(req, res) {
        try {
            const { id } = req.params;

            // Check if order exists
            const existingOrder = await dbQuery('SELECT id FROM orders WHERE id = ?', [id]);
            if (existingOrder.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Delete order details first (foreign key constraint)
            await dbQuery('DELETE FROM orderdetails WHERE orderId = ?', [id]);
            
            // Delete order
            await dbQuery('DELETE FROM orders WHERE id = ?', [id]);

            return res.status(200).json({
                success: true,
                message: 'Order deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting order:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete order',
                error: error.message
            });
        }
    }

    // Helper method to get order by ID (internal use)
    async getOrderByIdInternal(id) {
        const orderQuery = `
            SELECT 
                o.*,
                DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
                c.CounterName as counterName,
                c.phone as counterPhone,
                c.address as counterAddress,
                city.city as counterCity,
                city.district as counterDistrict,
                city.state as counterState,
                u.name as userName
            FROM orders o
            LEFT JOIN counters c ON o.counterID = c.id
            LEFT JOIN city ON c.CityID = city.id
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `;
        
        const orders = await dbQuery(orderQuery, [id]);
        const order = orders[0];
        
        if (order) {
            const orderDetailsQuery = `
                SELECT 
                    od.*,
                    p.name as productName,
                    p.sku as productSku,
                    p.description as productDescription
                FROM orderdetails od
                LEFT JOIN product p ON od.productId = p.id
                WHERE od.orderId = ?
                ORDER BY od.id
            `;
            
            const orderDetails = await dbQuery(orderDetailsQuery, [id]);
            order.orderDetails = orderDetails;
            order.itemCount = orderDetails.length;
            order.totalQuantity = orderDetails.reduce((sum, item) => sum + (item.qty || 0), 0);
        }
        
        return order;
    }

    // Get orders by counter
    async getOrdersByCounter(req, res) {
        try {
            const { counterId } = req.params;
            
            const query = `
                SELECT 
                    o.*,
                    DATE_FORMAT(o.orderDate, '%Y-%m-%d') AS orderDate,
                    c.CounterName as counterName,
                    u.name as userName
                FROM orders o
                LEFT JOIN counters c ON o.counterID = c.id
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.counterID = ?
                ORDER BY o.orderDate DESC, o.id DESC
            `;
            
            const orders = await dbQuery(query, [counterId]);
            
            return res.status(200).json({
                success: true,
                message: 'Orders retrieved successfully',
                data: orders,
                count: orders.length
            });
            
        } catch (error) {
            console.error('Error fetching orders by counter:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
                error: error.message
            });
        }
    }

    // Download invoice
    async downloadInvoice(req, res) {
        try {
            const { fileName } = req.params;
            
            // Security check - ensure filename is safe and is a PDF
            if (!fileName || fileName.includes('..') || !fileName.endsWith('.pdf')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid invoice filename'
                });
            }

            const invoiceFilePath = await invoiceService.getInvoice(fileName);
            
            // Set proper headers for PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
            
            // Stream the PDF file
            const fs = require('fs');
            const fileStream = fs.createReadStream(invoiceFilePath);
            fileStream.pipe(res);
            
        } catch (error) {
            console.error('Error downloading invoice:', error);
            return res.status(404).json({
                success: false,
                message: 'Invoice not found',
                error: error.message
            });
        }
    }
}

module.exports = new OrderController();
