const { pool } = require('../config/database');
const { TABLES } = require('../constants');

const DEFAULT_LIMIT = 500;

const buildDateTime = (value, options = {}) => {
    if (!value) return null;
    const str = String(value).trim();
    const date = new Date(str);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid date value provided');
    }

    const wantsEndOfDay = options.endOfDay === true;
    const looksLikeDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(str);
    if (looksLikeDateOnly) {
        if (wantsEndOfDay) {
            date.setHours(23, 59, 59, 999);
        } else {
            date.setHours(0, 0, 0, 0);
        }
    }

    return date.toISOString().slice(0, 19).replace('T', ' ');
};

class UserLog {
    static async fetchLogs({ userId = null, startDate = null, endDate = null, limit = DEFAULT_LIMIT } = {}) {
        const clauses = [];
        const params = [];

        if (userId !== null && userId !== undefined && userId !== '') {
            const numericUserId = Number(userId);
            if (!Number.isFinite(numericUserId)) {
                throw new Error('Invalid user identifier');
            }
            clauses.push('ul.userID = ?');
            params.push(numericUserId);
        }

        if (startDate) {
            clauses.push('ul.loginTime >= ?');
            params.push(startDate);
        }

        if (endDate) {
            clauses.push('ul.loginTime <= ?');
            params.push(endDate);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const limitValue = Number(limit) > 0 ? Math.min(Number(limit), 2000) : DEFAULT_LIMIT;

        const sql = `
            SELECT 
                ul.id,
                ul.userID,
                ul.loginTime,
                u.name,
                u.emailID,
                u.phone
            FROM ${TABLES.USER_LOG} ul
            LEFT JOIN ${TABLES.USERS} u ON u.id = ul.userID
            ${where}
            ORDER BY ul.loginTime DESC
            LIMIT ?
        `;

        params.push(limitValue);

        const [rows] = await pool.execute(sql, params);
        return rows;
    }

    static buildFilters(rawFilters = {}) {
        const filters = {};
        if (rawFilters.userId) {
            filters.userId = Number(rawFilters.userId) || null;
        }

        if (rawFilters.startDate) {
            filters.startDate = buildDateTime(rawFilters.startDate, { endOfDay: false });
        }

        if (rawFilters.endDate) {
            filters.endDate = buildDateTime(rawFilters.endDate, { endOfDay: true });
        }

        if (rawFilters.limit) {
            filters.limit = Math.min(Math.max(Number(rawFilters.limit) || DEFAULT_LIMIT, 1), 2000);
        }

        return filters;
    }

    static toDateTime(value, options = {}) {
        return buildDateTime(value, options);
    }
}

module.exports = UserLog;
