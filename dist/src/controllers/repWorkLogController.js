const { query: dbQuery } = require('../config/database');

class RepWorkLogController {
  async createWorkLog(req, res) {
    try {
      const { counterID, longitude, latitude, address, comments, userID } = req.body || {};

      const counterIdNum = Number(counterID);
      const lonNum = Number(longitude);
      const latNum = Number(latitude);
      const userIdNum = Number(userID);

      if (!Number.isFinite(counterIdNum)) {
        return res.status(400).json({ success: false, message: 'counterID is required and must be a valid number.' });
      }
      if (!Number.isFinite(lonNum) || !Number.isFinite(latNum)) {
        return res.status(400).json({ success: false, message: 'longitude and latitude are required and must be valid numbers.' });
      }
      if (!Number.isFinite(userIdNum)) {
        return res.status(400).json({ success: false, message: 'userID is required and must be a valid number.' });
      }
      if (latNum < -90 || latNum > 90) {
        return res.status(400).json({ success: false, message: 'latitude must be between -90 and 90 degrees.' });
      }
      if (lonNum < -180 || lonNum > 180) {
        return res.status(400).json({ success: false, message: 'longitude must be between -180 and 180 degrees.' });
      }

      const counterExists = await dbQuery('SELECT id FROM counters WHERE id = ? LIMIT 1', [counterIdNum]);
      if (!Array.isArray(counterExists) || !counterExists.length) {
        return res.status(404).json({ success: false, message: 'Counter not found.' });
      }

      const userExists = await dbQuery('SELECT id FROM users WHERE id = ? LIMIT 1', [userIdNum]);
      if (!Array.isArray(userExists) || !userExists.length) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const normalizedAddress = typeof address === 'string' && address.trim().length
        ? address.trim().slice(0, 255)
        : null;
      const normalizedComments = typeof comments === 'string' && comments.trim().length
        ? comments.trim().slice(0, 255)
        : null;

      const insertResult = await dbQuery(
        'INSERT INTO repworklog (counterID, longitude, latitude, address, comments, userID) VALUES (?, ?, ?, ?, ?, ?)',
        [
          counterIdNum,
          Number(lonNum.toFixed(7)),
          Number(latNum.toFixed(7)),
          normalizedAddress,
          normalizedComments,
          userIdNum
        ]
      );

      const [record] = await dbQuery(
        'SELECT id, counterID, longitude, latitude, address, comments, userID, createdDate FROM repworklog WHERE id = ? LIMIT 1',
        [insertResult.insertId]
      );

      return res.status(201).json({
        success: true,
        message: 'Work log recorded successfully.',
        data: record || {
          id: insertResult.insertId,
          counterID: counterIdNum,
          longitude: Number(lonNum.toFixed(7)),
          latitude: Number(latNum.toFixed(7)),
          address: normalizedAddress,
          comments: normalizedComments,
          userID: userIdNum
        }
      });
    } catch (error) {
      console.error('Error creating rep work log entry:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record work log entry.',
        error: error.message
      });
    }
  }

  async getRepresentativeSummary(req, res) {
    try {
      const { repId } = req.params || {};
      const repIdNum = Number(repId);

      if (!Number.isFinite(repIdNum)) {
        return res.status(400).json({ success: false, message: 'repId must be a valid number.' });
      }

      const rows = await dbQuery(
        `
          SELECT DATE_FORMAT(w.createdDate, '%Y-%m') AS yearMonth,
                 COUNT(*) AS entryCount
          FROM repworklog w
          INNER JOIN counters c ON w.counterID = c.id
          WHERE c.RepID = ?
            AND w.createdDate >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
          GROUP BY yearMonth
          ORDER BY yearMonth ASC
        `,
        [repIdNum]
      );

      const summary = Array.isArray(rows)
        ? rows.map((row) => ({
            yearMonth: row.yearMonth,
            entryCount: Number(row.entryCount) || 0
          }))
        : [];

      return res.status(200).json({
        success: true,
        message: 'Work log summary fetched successfully.',
        data: summary
      });
    } catch (error) {
      console.error('Error fetching representative work log summary:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch work log summary.',
        error: error.message
      });
    }
  }

  async getRepresentativeMonthLogs(req, res) {
    try {
      const { repId, yearMonth } = req.params || {};
      const repIdNum = Number(repId);

      if (!Number.isFinite(repIdNum)) {
        return res.status(400).json({ success: false, message: 'repId must be a valid number.' });
      }

      if (typeof yearMonth !== 'string' || !/^\d{4}-\d{2}$/.test(yearMonth)) {
        return res.status(400).json({ success: false, message: 'yearMonth must be in YYYY-MM format.' });
      }

      const logs = await dbQuery(
        `
          SELECT w.id,
                 w.counterID,
                 c.CounterName AS counterName,
                 w.longitude,
                 w.latitude,
                 w.address,
                 w.comments,
                 w.userID,
                 u.name AS loggedByName,
                 u.phone AS loggedByPhone,
                 w.createdDate
          FROM repworklog w
          INNER JOIN counters c ON w.counterID = c.id
          LEFT JOIN users u ON w.userID = u.id
          WHERE c.RepID = ?
            AND DATE_FORMAT(w.createdDate, '%Y-%m') = ?
          ORDER BY w.createdDate DESC
        `,
        [repIdNum, yearMonth]
      );

      return res.status(200).json({
        success: true,
        message: 'Work log entries fetched successfully.',
        data: Array.isArray(logs) ? logs : []
      });
    } catch (error) {
      console.error('Error fetching representative work log entries:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch work log entries.',
        error: error.message
      });
    }
  }
}

module.exports = new RepWorkLogController();
