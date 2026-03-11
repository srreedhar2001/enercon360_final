const { query: dbQuery } = require('../config/database');

class RepresentativeController {
    // Get all representatives (users who are sales reps)
    async getAllRepresentatives(req, res) {
        try {
            const query = `
                SELECT 
                    u.id,
                    u.name,
                    u.phone,
                    u.designation_id,
                    u.managerID,
                    m.name as manager_name
                FROM users u
                LEFT JOIN users m ON u.managerID = m.id
                WHERE u.designation_id = 2
                ORDER BY u.name
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
                    phone
                FROM users
                WHERE id = ?
            `;
            
            const representatives = await dbQuery(query, [id]);
            
            if (representatives.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Representative not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Representative retrieved successfully',
                data: representatives[0]
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

    // Get representatives by name search
    async searchRepresentatives(req, res) {
        try {
            const { search } = req.query;
            
            let query = `
                SELECT 
                    id,
                    name,
                    phone
                FROM users
            `;
            
            let params = [];
            
            if (search) {
                query += ` WHERE name LIKE ?`;
                params.push(`%${search}%`);
            }
            
            query += ` ORDER BY name`;
            
            const representatives = await dbQuery(query, params);
            
            res.json({
                success: true,
                message: 'Representatives retrieved successfully',
                data: representatives,
                count: representatives.length
            });
        } catch (error) {
            console.error('Error searching representatives:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search representatives',
                error: error.message
            });
        }
    }
}

module.exports = new RepresentativeController();
