const { pool } = require('../config/database');

class Category {
    // Returns array of { id, name }
    static async findAll() {
        try {
            // Schema provided: id (PK), category_name (varchar), created_at
            const [rows] = await pool.execute(
                `SELECT id, category_name AS name FROM productcategory ORDER BY category_name`
            );

            console.log
            return rows.map(r => ({ id: r.id, name: r.name }));
        } catch (error) {
            console.error('Error fetching categories from productcategory:', error.message || error);
            throw error;
        }
    }
}

module.exports = Category;
