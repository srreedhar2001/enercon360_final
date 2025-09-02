const { query: dbQuery } = require('../config/database');

class CityController {
    // Get all cities
    async getAllCities(req, res) {
        try {
            const query = `
                SELECT 
                    id,
                    city,
                    district,
                    state
                FROM city
                ORDER BY state, district, city
            `;
            
            const cities = await dbQuery(query);
            
            res.json({
                success: true,
                message: 'Cities retrieved successfully',
                data: cities,
                count: cities.length
            });
        } catch (error) {
            console.error('Error fetching cities:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch cities',
                error: error.message
            });
        }
    }

    // Get city by ID
    async getCityById(req, res) {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT 
                    id,
                    city,
                    district,
                    state
                FROM city
                WHERE id = ?
            `;
            
            const cities = await dbQuery(query, [id]);
            
            if (cities.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'City not found'
                });
            }
            
            res.json({
                success: true,
                message: 'City retrieved successfully',
                data: cities[0]
            });
        } catch (error) {
            console.error('Error fetching city:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch city',
                error: error.message
            });
        }
    }

    // Get cities by state
    async getCitiesByState(req, res) {
        try {
            const { state } = req.params;
            
            const query = `
                SELECT 
                    id,
                    city,
                    district,
                    state
                FROM city
                WHERE state = ?
                ORDER BY district, city
            `;
            
            const cities = await dbQuery(query, [state]);
            
            res.json({
                success: true,
                message: `Cities for ${state} retrieved successfully`,
                data: cities,
                count: cities.length
            });
        } catch (error) {
            console.error('Error fetching cities by state:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch cities by state',
                error: error.message
            });
        }
    }
}

module.exports = new CityController();
