const { pool } = require('../config/database');

class ProductPurchase {
    static async findAll() {
        try {
            const [rows] = await pool.execute(
                `SELECT * FROM productPurchaseDetails ORDER BY created_at DESC`
            );
            return rows;
        } catch (error) {
            console.error('Error fetching product purchases:', error.message || error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await pool.execute(
                `SELECT * FROM productPurchaseDetails WHERE id = ?`,
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('Error fetching product purchase by id:', error.message || error);
            throw error;
        }
    }

    static async create(data) {
        try {
            const [result] = await pool.execute(
                `INSERT INTO productPurchaseDetails 
                (ProductName, ProductCategoryID, Qty, productsValue, advancePayment, balancePayment, 
                CourierCharges, advancePaymentDate, expectedDateOfDelivery, deliveredDate, isDeliver) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.ProductName,
                    data.ProductCategoryID,
                    data.Qty,
                    data.productsValue,
                    data.advancePayment || 0,
                    data.balancePayment || 0,
                    data.CourierCharges || 0,
                    data.advancePaymentDate || null,
                    data.expectedDateOfDelivery || null,
                    data.deliveredDate || null,
                    data.isDeliver || 0
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating product purchase:', error.message || error);
            throw error;
        }
    }

    static async update(id, data) {
        try {
            const [result] = await pool.execute(
                `UPDATE productPurchaseDetails 
                SET ProductName = ?, ProductCategoryID = ?, Qty = ?, productsValue = ?, 
                    advancePayment = ?, balancePayment = ?, CourierCharges = ?, 
                    advancePaymentDate = ?, expectedDateOfDelivery = ?, deliveredDate = ?, isDeliver = ?
                WHERE id = ?`,
                [
                    data.ProductName,
                    data.ProductCategoryID,
                    data.Qty,
                    data.productsValue,
                    data.advancePayment || 0,
                    data.balancePayment || 0,
                    data.CourierCharges || 0,
                    data.advancePaymentDate || null,
                    data.expectedDateOfDelivery || null,
                    data.deliveredDate || null,
                    data.isDeliver || 0,
                    id
                ]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating product purchase:', error.message || error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await pool.execute(
                `DELETE FROM productPurchaseDetails WHERE id = ?`,
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting product purchase:', error.message || error);
            throw error;
        }
    }
}

module.exports = ProductPurchase;
