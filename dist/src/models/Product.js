const { pool } = require('../config/database');

class Product {
    static _columns = null;

    static async getColumns() {
        if (Array.isArray(Product._columns) && Product._columns.length) return Product._columns;
        try {
            const [rows] = await pool.execute('SHOW COLUMNS FROM product');
            Product._columns = rows.map(r => r.Field);
            return Product._columns;
        } catch (e) {
            console.error('Error reading product columns:', e);
            Product._columns = [];
            return Product._columns;
        }
    }

    static async hasColumn(name) {
        const cols = await Product.getColumns();
        return cols.includes(name);
    }
    static async findAll() {
        try {
            const [rows] = await pool.execute(`
                SELECT * FROM product ORDER BY created_at DESC
            `);
            return rows;
        } catch (error) {
            console.error('Error fetching all products:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await pool.execute(`
                SELECT * FROM product WHERE id = ?
            `, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding product by ID:', error);
            throw error;
        }
    }

    static async findBySku(sku) {
        try {
            const [rows] = await pool.execute(`
                SELECT * FROM product WHERE sku = ?
            `, [sku]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding product by SKU:', error);
            throw error;
        }
    }

    static async findByCategory(category) {
        try {
            const [rows] = await pool.execute(`
                SELECT * FROM product WHERE category = ? ORDER BY name
            `, [category]);
            return rows;
        } catch (error) {
            console.error('Error finding products by category:', error);
            throw error;
        }
    }

    static async create(productData) {
        try {
            const cols = [
                'name','sku','category','description','brand','weight','dimensions',
                'mrp','manufacturingPrice','expDate','qty','manDate','isActive'
            ];
            const values = [
                productData.name,
                productData.sku ?? null,
                productData.category ?? null,
                productData.description ?? null,
                productData.brand ?? null,
                productData.weight ?? null,
                productData.dimensions ?? null,
                productData.mrp ?? null,
                productData.manufacturingPrice ?? null,
                productData.expDate ?? null,
                (productData.qty ?? 0),
                productData.manDate ?? null,
                (productData.isActive !== undefined ? productData.isActive : 1)
            ];

            // Optionally include gst_id if the column exists
            if (await Product.hasColumn('gst_id')) {
                cols.push('gst_id');
                values.push(productData.gst_id ?? null);
            }

            cols.push('created_at','updated_at');
            // created/updated values are NOW() placeholders
            const placeholders = cols.map(c => (c === 'created_at' || c === 'updated_at') ? 'NOW()' : '?');

            const sql = `INSERT INTO product (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
            const [result] = await pool.execute(sql, values);
            return result.insertId;
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            const fields = [];
            const values = [];
            const existingCols = await Product.getColumns();
            
            // Build dynamic update query but only for existing columns
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && existingCols.includes(key)) {
                    fields.push(`${key} = ?`);
                    values.push(updateData[key]);
                }
            });
            
            if (fields.length === 0) return false;
            
            fields.push('updated_at = NOW()');
            values.push(id);
            
            const [result] = await pool.execute(`
                UPDATE product SET ${fields.join(', ')} WHERE id = ?
            `, values);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await pool.execute('DELETE FROM product WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    static async search(searchTerm) {
        try {
            const [rows] = await pool.execute(`
                SELECT * FROM product 
                WHERE name LIKE ? OR sku LIKE ? OR category LIKE ? OR brand LIKE ?
                ORDER BY name
            `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
            return rows;
        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    static async getProductImage(id) {
        try {
            const [rows] = await pool.execute(`
                SELECT productImage 
                FROM product 
                WHERE id = ?
            `, [id]);
            return rows[0]?.productImage || null;
        } catch (error) {
            console.error('Error fetching product image:', error);
            throw error;
        }
    }

    static async updateProductImage(id, imageBuffer) {
        try {
            const [result] = await pool.execute(`
                UPDATE product 
                SET productImage = ?, updated_at = NOW()
                WHERE id = ?
            `, [imageBuffer, id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating product image:', error);
            throw error;
        }
    }

    // Helper method to convert isActive (1/0) to status (active/inactive)
    static formatForFrontend(product) {
        return {
            ...product,
            status: product.isActive ? 'active' : 'inactive',
            price: product.mrp,
            stock: product.qty,
            gst_id: product.gst_id,
            stockStatus: product.qty === 0 ? 'out-of-stock' : (product.isActive ? 'active' : 'inactive')
        };
    }

    // Helper method to convert status (active/inactive) to isActive (1/0)
    static formatForDatabase(productData) {
        const { status, price, stock, category, expDate, manDate, manufacturingPrice, weight, gstId, gst_id, ...rest } = productData;

        // Accept numeric category IDs (foreign key) or legacy string categories; store as given
        const normalizedCategory = category !== undefined && category !== '' ? category : null;

        // Normalize dates: '' -> null, Date -> 'YYYY-MM-DD', string acceptable
        const toDateOrNull = (v) => {
            if (v === undefined || v === null || v === '') return null;
            if (v instanceof Date && !isNaN(v)) {
                const yyyy = v.getFullYear();
                const mm = String(v.getMonth() + 1).padStart(2, '0');
                const dd = String(v.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
            // assume 'YYYY-MM-DD' string is fine
            return v;
        };

        // Normalize numbers: undefined/'' -> null
        const toNumOrNull = (v) => {
            if (v === undefined || v === null || v === '') return null;
            const n = Number(v);
            return isNaN(n) ? null : n;
        };

        const toIntOrNull = (v) => {
            if (v === undefined || v === null || v === '') return null;
            const n = parseInt(v, 10);
            return Number.isFinite(n) ? n : null;
        };

        return {
            ...rest,
            category: normalizedCategory,
            isActive: status === 'active' ? 1 : 0,
            mrp: toNumOrNull(price),
            manufacturingPrice: toNumOrNull(manufacturingPrice),
            qty: Number.isFinite(Number(stock)) ? Number(stock) : 0,
            expDate: toDateOrNull(expDate),
            manDate: toDateOrNull(manDate),
            weight: toNumOrNull(weight),
            gst_id: toIntOrNull(gstId ?? gst_id)
        };
    }
}

module.exports = Product;
