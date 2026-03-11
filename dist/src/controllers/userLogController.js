const UserLog = require('../models/UserLog');
const { formatResponse, formatErrorResponse } = require('../helpers');
const { HTTP_STATUS } = require('../constants');

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const mysqlStringToDate = (value) => {
    if (!value) return null;
    const normalized = value.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
        const err = new Error('Invalid date generated');
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw err;
    }
    return date;
};

const normalizeDateInput = (value, { endOfDay = false } = {}) => {
    if (!value) return null;
    try {
        const mysql = UserLog.toDateTime(value, { endOfDay });
        const jsDate = mysqlStringToDate(mysql);
        return { mysql, jsDate };
    } catch (error) {
        const err = new Error('Invalid date provided');
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        err.cause = error;
        throw err;
    }
};

const computeDefaultRange = () => {
    const end = new Date();
    const start = new Date(Date.now() - THREE_DAYS_MS);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const mysqlStart = UserLog.toDateTime(start, { endOfDay: false });
    const mysqlEnd = UserLog.toDateTime(end, { endOfDay: true });

    return {
        start,
        end,
        mysqlStart,
        mysqlEnd
    };
};

class UserLogController {
    static async list(req, res) {
        try {
            const { userId, startDate, endDate, limit } = req.query;
            const filters = {};

            if (userId) {
                const numericUserId = Number(userId);
                if (!Number.isFinite(numericUserId)) {
                    const { response, statusCode } = formatErrorResponse(new Error('Invalid user identifier'), HTTP_STATUS.BAD_REQUEST);
                    return res.status(statusCode).json(response);
                }
                filters.userId = numericUserId;
            }

            const normalizedStart = normalizeDateInput(startDate, { endOfDay: false });
            const normalizedEnd = normalizeDateInput(endDate, { endOfDay: true });

            let mysqlStart = normalizedStart?.mysql;
            let mysqlEnd = normalizedEnd?.mysql;
            let plainStart = normalizedStart?.jsDate;
            let plainEnd = normalizedEnd?.jsDate;

            if (!mysqlStart || !mysqlEnd) {
                const defaults = computeDefaultRange();
                if (!mysqlStart) {
                    mysqlStart = defaults.mysqlStart;
                    plainStart = defaults.start;
                }
                if (!mysqlEnd) {
                    mysqlEnd = defaults.mysqlEnd;
                    plainEnd = defaults.end;
                }
            }

            if (plainEnd < plainStart) {
                const { response, statusCode } = formatErrorResponse(new Error('End date must be after start date'), HTTP_STATUS.BAD_REQUEST);
                return res.status(statusCode).json(response);
            }

            if (limit) {
                const parsedLimit = Number(limit);
                if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
                    const { response, statusCode } = formatErrorResponse(new Error('Limit must be a positive number'), HTTP_STATUS.BAD_REQUEST);
                    return res.status(statusCode).json(response);
                }
                filters.limit = parsedLimit;
            }

            filters.startDate = mysqlStart;
            filters.endDate = mysqlEnd;

            const logs = await UserLog.fetchLogs(filters);

            const { response, statusCode } = formatResponse(true, 'User logs retrieved successfully', {
                logs,
                count: logs.length,
                filters: {
                    userId: filters.userId || null,
                    startDate: plainStart.toISOString(),
                    endDate: plainEnd.toISOString()
                }
            });
            return res.status(statusCode).json(response);
        } catch (error) {
            const status = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
            const { response, statusCode } = formatErrorResponse(error, status);
            return res.status(statusCode).json(response);
        }
    }
}

module.exports = UserLogController;
