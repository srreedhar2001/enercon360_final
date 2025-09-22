const { query: dbQuery } = require('../config/database');

class CounterController {
    // Get last 12 months (including current) counters created count per month
    async getLastSixMonthsCreatedTotals(req, res) {
        try {
            // Determine available timestamp column to fall back on when createdDate is NULL
            const colCheck = await dbQuery(`
                SELECT COLUMN_NAME AS name
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'counters' AND COLUMN_NAME IN ('createdAt','created_at')
            `);
            let fallbackCol = null;
            if (Array.isArray(colCheck) && colCheck.length) {
                // Prefer camelCase createdAt if both exist
                const names = colCheck.map(r => r.name);
                fallbackCol = names.includes('createdAt') ? 'createdAt' : (names.includes('created_at') ? 'created_at' : null);
            }

            const dateExpr = fallbackCol ? `DATE(COALESCE(c.createdDate, c.${fallbackCol}))` : `DATE(c.createdDate)`;

            const sql = `
                SELECT DATE_FORMAT(${dateExpr}, '%Y-%m') AS ym, COUNT(*) AS cnt
                FROM counters c
                WHERE ${dateExpr} IS NOT NULL
                  AND ${dateExpr} >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
                GROUP BY ym
            `;
            const rows = await dbQuery(sql);

            // Build a complete 12-month series oldest -> newest
            const now = new Date();
            const series = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
                d.setUTCMonth(d.getUTCMonth() - i);
                const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                const found = rows.find(r => String(r.ym) === ym);
                series.push({ ym, label, count: Number(found?.cnt || 0) });
            }

            res.json({
                success: true,
                message: 'Last 12 months counters created totals fetched',
                data: series
            });
        } catch (error) {
            console.error('Error fetching last 6 months created counters totals:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch last 12 months counters created totals',
                error: error.message
            });
        }
    }

    // Get counters created in a specific month (ym = YYYY-MM)
    async getCountersByCreatedMonth(req, res) {
        try {
            const { ym } = req.query;
            if (!ym || !/^\d{4}-\d{2}$/.test(ym)) {
                return res.status(400).json({ success: false, message: 'Invalid ym. Expected YYYY-MM' });
            }

            // Determine available timestamp column to fall back on when createdDate is NULL
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
            const dateExpr = fallbackCol ? `DATE(COALESCE(c.createdDate, c.${fallbackCol}))` : `DATE(c.createdDate)`;

                        const sql = `
                                SELECT 
                                        c.*,
                                        city.city as cityName,
                                        city.district,
                                        city.state,
                                        u.name as repName,
                                        u.phone as repMobile,
                                        (
                                                SELECT COALESCE(ROUND(SUM(COALESCE(o.grandTotal,0))), 0)
                                                FROM orders o
                                                WHERE o.counterID = c.id
                                                    AND DATE_FORMAT(o.orderDate, '%Y-%m') = ?
                                        ) AS monthOrderTotal,
                                        (
                                                SELECT COUNT(*)
                                                FROM orders o2
                                                WHERE o2.counterID = c.id
                                                    AND DATE_FORMAT(o2.orderDate, '%Y-%m') = ?
                                        ) AS monthOrderCount
                                FROM counters c
                                LEFT JOIN city ON c.CityID = city.id
                                LEFT JOIN users u ON c.RepID = u.id
                                WHERE ${dateExpr} IS NOT NULL
                                    AND DATE_FORMAT(${dateExpr}, '%Y-%m') = ?
                                ORDER BY c.CounterName
                        `;
                        const rows = await dbQuery(sql, [ym, ym, ym]);
            res.json({ success: true, message: 'Counters created in month fetched', data: rows, count: rows.length });
        } catch (error) {
            console.error('Error fetching counters by created month:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch counters by created month', error: error.message });
        }
    }

    // Get all counters with city and representative details
    async getAllCounters(req, res) {
        try {
            const query = `
                SELECT 
                    c.*,
                    city.city as cityName,
                    city.district,
                    city.state,
                    u.name as repName,
                    u.phone as repMobile
                FROM counters c
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON c.RepID = u.id
                ORDER BY c.CounterName
            `;
            
            const counters = await dbQuery(query);
            
            res.json({
                success: true,
                message: 'Counters retrieved successfully',
                data: counters,
                count: counters.length
            });
        } catch (error) {
            console.error('Error fetching counters:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch counters',
                error: error.message
            });
        }
    }

    // Get counter by ID
    async getCounterById(req, res) {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT 
                    c.*,
                    city.city as cityName,
                    city.district,
                    city.state,
                    u.name as repName,
                    u.phone as repMobile
                FROM counters c
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON c.RepID = u.id
                WHERE c.id = ?
            `;
            
            const counters = await dbQuery(query, [id]);
            
            if (counters.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Counter not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Counter retrieved successfully',
                data: counters[0]
            });
        } catch (error) {
            console.error('Error fetching counter:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch counter',
                error: error.message
            });
        }
    }

    // Create new counter
    async createCounter(req, res) {
        try {
            const {
                CounterName,
                CityID,
                RepID,
                longitude,
                latitude,
                phone,
                gst,
                address,
                createdDate
            } = req.body;

            // Validation
            if (!CounterName || !CityID || !RepID || longitude === undefined || latitude === undefined || longitude === null || latitude === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: CounterName, CityID, RepID, longitude, latitude'
                });
            }

            // Validate coordinates are numbers
            if (isNaN(longitude) || isNaN(latitude)) {
                return res.status(400).json({
                    success: false,
                    message: 'Longitude and latitude must be valid numbers'
                });
            }

            // Check if city exists
            const cityCheck = await dbQuery('SELECT id FROM city WHERE id = ?', [CityID]);
            if (cityCheck.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid city ID'
                });
            }

            // Check if representative exists
            const repCheck = await dbQuery('SELECT id FROM users WHERE id = ?', [RepID]);
            if (repCheck.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid representative ID'
                });
            }

            // Always set createdDate to provided value or today's date to ensure analytics include it
            const createdDateValue = createdDate || new Date().toISOString().slice(0, 10);
            const query = `
                INSERT INTO counters (CounterName, CityID, RepID, longitude, latitude, phone, gst, address, createdDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await dbQuery(query, [
                CounterName,
                CityID,
                RepID,
                longitude,
                latitude,
                phone || null,
                gst || null,
                address || null,
                createdDateValue
            ]);
            
            // Fetch the created counter with related data
            const newCounter = await dbQuery(`
                SELECT 
                    c.*,
                    city.city as cityName,
                    city.district,
                    city.state,
                    u.name as repName,
                    u.phone as repMobile
                FROM counters c
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON c.RepID = u.id
                WHERE c.id = ?
            `, [result.insertId]);
            
            res.status(201).json({
                success: true,
                message: 'Counter created successfully',
                data: newCounter[0]
            });
        } catch (error) {
            console.error('Error creating counter:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create counter',
                error: error.message
            });
        }
    }

    // Update counter
    async updateCounter(req, res) {
        try {
            const { id } = req.params;
            const {
                CounterName,
                CityID,
                RepID,
                longitude,
                latitude,
                phone,
                gst,
                address,
                createdDate
            } = req.body;

            // Check if counter exists
            const existingCounter = await dbQuery('SELECT id FROM counters WHERE id = ?', [id]);
            if (existingCounter.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Counter not found'
                });
            }

            // Validation for required fields (allow 0 for coordinates)
            if (!CounterName || CityID === undefined || CityID === null || RepID === undefined || RepID === null || longitude === undefined || longitude === null || latitude === undefined || latitude === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: CounterName, CityID, RepID, longitude, latitude'
                });
            }

            // Validate coordinates are numbers
            const lng = Number(longitude);
            const lat = Number(latitude);
            if (Number.isNaN(lng) || Number.isNaN(lat)) {
                return res.status(400).json({
                    success: false,
                    message: 'Longitude and latitude must be valid numbers'
                });
            }

            // Optional: ensure CityID and RepID exist (align with create validation)
            const cityCheck = await dbQuery('SELECT id FROM city WHERE id = ?', [CityID]);
            if (cityCheck.length === 0) {
                return res.status(400).json({ success: false, message: 'Invalid city ID' });
            }
            const repCheck = await dbQuery('SELECT id FROM users WHERE id = ?', [RepID]);
            if (repCheck.length === 0) {
                return res.status(400).json({ success: false, message: 'Invalid representative ID' });
            }

            const query = createdDate ? `
                UPDATE counters 
                SET CounterName = ?, CityID = ?, RepID = ?, longitude = ?, latitude = ?, 
                    phone = ?, gst = ?, address = ?, createdDate = ?
                WHERE id = ?
            ` : `
                UPDATE counters 
                SET CounterName = ?, CityID = ?, RepID = ?, longitude = ?, latitude = ?, 
                    phone = ?, gst = ?, address = ?
                WHERE id = ?
            `;
            
            await dbQuery(query, createdDate ? [
                CounterName,
                CityID,
                RepID,
                lng,
                lat,
                phone || null,
                gst || null,
                address || null,
                createdDate,
                id
            ] : [
                CounterName,
                CityID,
                RepID,
                lng,
                lat,
                phone || null,
                gst || null,
                address || null,
                id
            ]);
            
            // Fetch the updated counter with related data
            const updatedCounter = await dbQuery(`
                SELECT 
                    c.*,
                    city.city as cityName,
                    city.district,
                    city.state,
                    u.name as repName,
                    u.phone as repMobile
                FROM counters c
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON c.RepID = u.id
                WHERE c.id = ?
            `, [id]);
            
            res.json({
                success: true,
                message: 'Counter updated successfully',
                data: updatedCounter[0]
            });
        } catch (error) {
            console.error('Error updating counter:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update counter',
                error: error.message
            });
        }
    }

    // Delete counter
    async deleteCounter(req, res) {
        try {
            const { id } = req.params;
            
            // Check if counter exists
            const existingCounter = await dbQuery('SELECT id FROM counters WHERE id = ?', [id]);
            if (existingCounter.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Counter not found'
                });
            }

            // Check if counter has associated orders
            const orderCheck = await dbQuery('SELECT id FROM orders WHERE counterID = ? LIMIT 1', [id]);
            if (orderCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete counter with existing orders. Please handle orders first.'
                });
            }
            
            await dbQuery('DELETE FROM counters WHERE id = ?', [id]);
            
            res.json({
                success: true,
                message: 'Counter deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting counter:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete counter',
                error: error.message
            });
        }
    }

    // Get counters by city
    async getCountersByCity(req, res) {
        try {
            const { cityId } = req.params;
            
            const query = `
                SELECT 
                    c.*,
                    city.city as cityName,
                    city.district,
                    city.state,
                    u.name as repName,
                    u.phone as repMobile
                FROM counters c
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON c.RepID = u.id
                WHERE c.CityID = ?
                ORDER BY c.CounterName
            `;
            
            const counters = await dbQuery(query, [cityId]);
            
            res.json({
                success: true,
                message: `Counters for city ${cityId} retrieved successfully`,
                data: counters,
                count: counters.length
            });
        } catch (error) {
            console.error('Error fetching counters by city:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch counters by city',
                error: error.message
            });
        }
    }

    // Get counters by representative
    async getCountersByRepresentative(req, res) {
        try {
            const { repId } = req.params;
            
            const query = `
                SELECT 
                    c.*,
                    city.city as cityName,
                    city.district,
                    city.state,
                    u.name as repName,
                    u.phone as repMobile
                FROM counters c
                LEFT JOIN city ON c.CityID = city.id
                LEFT JOIN users u ON c.RepID = u.id
                WHERE c.RepID = ?
                ORDER BY c.CounterName
            `;
            
            const counters = await dbQuery(query, [repId]);
            
            res.json({
                success: true,
                message: `Counters for representative ${repId} retrieved successfully`,
                data: counters,
                count: counters.length
            });
        } catch (error) {
            console.error('Error fetching counters by representative:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch counters by representative',
                error: error.message
            });
        }
    }
}

module.exports = new CounterController();
