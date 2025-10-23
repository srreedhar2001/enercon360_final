const { pool } = require('../config/database');
const { DEFAULTS, TABLES } = require('../constants');
const { isOTPExpired } = require('../helpers');

class User {
    static async findByMobile(mobile) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM users WHERE phone = ?',
                [mobile]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding user by mobile:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM users WHERE emailID = ?',
                [email]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    static async create(userData) {
        try {
            const { mobile, name, email } = userData;
            const [result] = await pool.execute(
                'INSERT INTO users (phone, name, emailID, created_at) VALUES (?, ?, ?, NOW())',
                [mobile, name, email]
            );
            return { id: result.insertId, ...userData };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async updateOtp(mobile, otp, otpExpiry) {
        try {
            // Using existing 'code' field and 'code_created_at' for OTP functionality
            const [result] = await pool.execute(
                'UPDATE users SET code = ?, code_created_at = NOW() WHERE phone = ?',
                [otp, mobile]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating OTP:', error);
            throw error;
        }
    }

    static async verifyOtp(mobile, otp) {
        try {
            console.log(`🔍 Verifying OTP for mobile: ${mobile}, OTP: ${otp}`);
            
            // First, let's check what's in the database
            const [debugRows] = await pool.execute(`
                SELECT phone, code, code_created_at, 
                       TIMESTAMPDIFF(MINUTE, code_created_at, NOW()) as minutes_ago
                FROM users 
                WHERE phone = ?
            `, [mobile]);
            
            if (debugRows[0]) {
                console.log(`📊 Database state:`, {
                    stored_code: debugRows[0].code,
                    created_at: debugRows[0].code_created_at,
                    minutes_ago: debugRows[0].minutes_ago,
                    provided_otp: otp
                });
            }
            
            // Check if code matches and was created within 5 minutes with complete user info
            const [rows] = await pool.execute(`
                SELECT u.*, 
                       d.name as designation_name,
                       m.name as manager_name
                FROM users u
                LEFT JOIN designation d ON u.designation_id = d.id
                LEFT JOIN users m ON u.managerID = m.id
                WHERE u.phone = ? AND u.code = ? AND u.code_created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            `, [mobile, otp]);
            
            console.log(`✅ OTP verification result: ${rows.length > 0 ? 'SUCCESS' : 'FAILED'}`);
            return rows[0] || null;
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw error;
        }
    }

    static async clearOtp(mobile) {
        try {
            const [result] = await pool.execute(
                'UPDATE users SET code = NULL WHERE phone = ?',
                [mobile]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error clearing OTP:', error);
            throw error;
        }
    }

    static async updateLastLogin(userId) {
        try {
            const [result] = await pool.execute(
                'UPDATE users SET updated_at = NOW() WHERE id = ?',
                [userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating last login:', error);
            throw error;
        }
    }

    static async logLogin(userId) {
        try {
            const [result] = await pool.execute(
                `INSERT INTO ${TABLES.USER_LOG} (userID) VALUES (?)`,
                [userId]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error logging user login:', error);
            throw error;
        }
    }

    // Additional methods for user management
    static async getAll() {
        try {
            const [rows] = await pool.execute(
                `SELECT u.*, d.name as designation_name, m.name as manager_name
                 FROM users u 
                 LEFT JOIN designation d ON u.designation_id = d.id 
                 LEFT JOIN users m ON u.managerID = m.id
                 ORDER BY u.created_at DESC`
            );
            return rows;
        } catch (error) {
            console.error('Error fetching all users:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await pool.execute(
                `SELECT u.*, d.name as designation_name 
                 FROM users u 
                 LEFT JOIN designation d ON u.designation_id = d.id 
                 WHERE u.id = ?`,
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    static async createComplete(userData) {
        try {
            const { mobile, name, email, username, designation_id, managerID, salary, allowance, registered } = userData;
            const [result] = await pool.execute(
                `INSERT INTO users (phone, name, emailID, username, designation_id, managerID, salary, allowance, registered, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [mobile, name, email, username, designation_id, managerID, salary, allowance, registered]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating complete user:', error);
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            const fields = [];
            const values = [];
            
            // Build dynamic update query
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    // Map frontend field names to database field names
                    const fieldMap = {
                        mobile: 'phone',
                        email: 'emailID'
                    };
                    const dbField = fieldMap[key] || key;
                    fields.push(`${dbField} = ?`);
                    values.push(updateData[key]);
                }
            });
            
            if (fields.length === 0) return false;
            
            fields.push('updated_at = NOW()');
            values.push(id);
            
            const [result] = await pool.execute(
                `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM users WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    static async findByDesignation(designation_id) {
        try {
            const [rows] = await pool.execute(
                `SELECT u.*, d.name as designation_name 
                 FROM users u 
                 LEFT JOIN designation d ON u.designation_id = d.id 
                 WHERE u.designation_id = ?`,
                [designation_id]
            );
            return rows;
        } catch (error) {
            console.error('Error finding users by designation:', error);
            throw error;
        }
    }

    static async getByDesignation(designation_id) {
        return this.findByDesignation(designation_id);
    }
}

module.exports = User;
