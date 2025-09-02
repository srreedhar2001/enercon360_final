const { query: dbQuery } = require('../config/database');

class RepresentativeController {
    // Get all representatives (users who can be sales reps)
    async getAllRepresentatives(req, res) {
        try {
            const query = `
                SELECT 
                    id,
                    name,
                    phone
                FROM users
                ORDER BY name
            `;
            
            const representatives = await dbQuery(query);
            
            res.json({
                success: true,
                message: 'Representatives retrieved successfully',
                data: representatives,
                count: representatives.length
            });
        } catch (error) {
            console.error('Error fetching representatives:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch representatives',
                error: error.message
            });
        }
    }

    // Get representative by ID
    async getRepresentativeById(req, res) {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT 
                    id,
                    name,
                    phone,
                    email,
                    role,
                    isActive,
                    created_at
                FROM users
                WHERE id = ? AND (role IN ('admin', 'manager', 'representative') OR role IS NULL)
            `;
            
            const representatives = await dbQuery(query, [id]);
            
            if (representatives.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Representative not found'
                });
            }
            
            // Get counter count for this representative
            const counterCount = await dbQuery(
                'SELECT COUNT(*) as counter_count FROM counters WHERE RepID = ?',
                [id]
            );
            
            const representative = representatives[0];
            representative.counter_count = counterCount[0].counter_count;
            
            res.json({
                success: true,
                message: 'Representative retrieved successfully',
                data: representative
            });
        } catch (error) {
            console.error('Error fetching representative:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch representative',
                error: error.message
            });
        }
    }

    // Get only active representatives
    async getActiveRepresentatives(req, res) {
        try {
            const query = `
                SELECT 
                    id,
                    name,
                    phone,
                    email,
                    role,
                    isActive,
                    created_at
                FROM users
                WHERE isActive = 1 
                AND (role IN ('admin', 'manager', 'representative') OR role IS NULL)
                ORDER BY name
            `;
            
            const representatives = await dbQuery(query);
            
            res.json({
                success: true,
                message: 'Active representatives retrieved successfully',
                data: representatives,
                count: representatives.length
            });
        } catch (error) {
            console.error('Error fetching active representatives:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch active representatives',
                error: error.message
            });
        }
    }
}

module.exports = new RepresentativeController();
