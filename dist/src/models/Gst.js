const { pool } = require('../config/database');

class GST {
    // Return raw rows from gst table to remain compatible with unknown schemas
    static async findAll() {
        try {
            const [rows] = await pool.execute('SELECT * FROM gst');
            return rows;
        } catch (error) {
            console.error('Error fetching GST list:', error);
            throw error;
        }
    }
}

module.exports = GST;
