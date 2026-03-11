const { pool } = require('../config/database');
const { TABLES } = require('../constants');

const TABLE = TABLES.DOCTOR_CALLS;

const mapRow = (row) => ({
    id: row.id,
    representativeId: row.userID,
    representativeName: row.representativeName || null,
    cityId: row.cityID,
    cityName: row.cityName || null,
    district: row.district || null,
    state: row.state || null,
    doctorName: row.drName,
    specialityId: row.speciality,
    specialityName: row.specialityName || null,
    address: row.address || null,
    status: Number(row.status) === 1,
    createdDate: row.createdDate
});

class DoctorCall {
    static async list({ representativeId, status } = {}) {
        const clauses = [];
        const params = [];

        if (representativeId) {
            clauses.push('d.userID = ?');
            params.push(representativeId);
        }

        if (typeof status === 'number') {
            clauses.push('d.status = ?');
            params.push(status);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

        const sql = `
            SELECT
                d.id,
                d.userID,
                d.cityID,
                d.drName,
                d.speciality,
                d.address,
                d.status,
                d.createdDate,
                u.name AS representativeName,
                u.phone AS representativePhone,
                c.city AS cityName,
                c.district,
                c.state,
                pc.category_name AS specialityName
            FROM ${TABLE} d
            LEFT JOIN ${TABLES.USERS} u ON u.id = d.userID
            LEFT JOIN city c ON c.id = d.cityID
            LEFT JOIN productcategory pc ON pc.id = d.speciality
            ${where}
            ORDER BY d.createdDate DESC, d.id DESC
        `;

        const [rows] = await pool.execute(sql, params);
        return rows.map(mapRow);
    }

    static async getById(id) {
        const [rows] = await pool.execute(
            `SELECT d.*, u.name AS representativeName, c.city AS cityName, c.district, c.state, pc.category_name AS specialityName
             FROM ${TABLE} d
             LEFT JOIN ${TABLES.USERS} u ON u.id = d.userID
             LEFT JOIN city c ON c.id = d.cityID
             LEFT JOIN productcategory pc ON pc.id = d.speciality
             WHERE d.id = ?`,
            [id]
        );
        return rows[0] ? mapRow(rows[0]) : null;
    }

    static async create({ representativeId, cityId, doctorName, specialityId, address = null, status = 1 }) {
        const [result] = await pool.execute(
            `INSERT INTO ${TABLE} (userID, cityID, drName, speciality, address, status)
             VALUES (?, ?, ?, ?, ?, ?)` ,
            [representativeId, cityId, doctorName, specialityId, address, status]
        );
        return this.getById(result.insertId);
    }

    static async update(id, updates = {}) {
        const allowed = {
            representativeId: 'userID',
            cityId: 'cityID',
            doctorName: 'drName',
            specialityId: 'speciality',
            address: 'address',
            status: 'status'
        };

        const sets = [];
        const params = [];

        Object.entries(allowed).forEach(([inputKey, column]) => {
            if (updates[inputKey] !== undefined) {
                sets.push(`${column} = ?`);
                params.push(updates[inputKey]);
            }
        });

        if (!sets.length) {
            return this.getById(id);
        }

        params.push(id);

        await pool.execute(
            `UPDATE ${TABLE} SET ${sets.join(', ')} WHERE id = ?`,
            params
        );

        return this.getById(id);
    }

    static async setStatus(id, status) {
        await pool.execute(
            `UPDATE ${TABLE} SET status = ? WHERE id = ?`,
            [status, id]
        );
        return this.getById(id);
    }
}

module.exports = DoctorCall;
