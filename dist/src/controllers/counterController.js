const { query: dbQuery } = require('../config/database');

class CounterController {
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

            const query = createdDate ? `
                INSERT INTO counters (CounterName, CityID, RepID, longitude, latitude, phone, gst, address, createdDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ` : `
                INSERT INTO counters (CounterName, CityID, RepID, longitude, latitude, phone, gst, address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await dbQuery(query, createdDate ? [
                CounterName,
                CityID,
                RepID,
                longitude,
                latitude,
                phone || null,
                gst || null,
                address || null,
                createdDate
            ] : [
                CounterName,
                CityID,
                RepID,
                longitude,
                latitude,
                phone || null,
                gst || null,
                address || null
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
