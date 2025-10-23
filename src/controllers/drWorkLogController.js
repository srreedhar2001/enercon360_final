const { query: dbQuery } = require('../config/database');

class DrWorkLogController {
  async createDoctorLog(req, res) {
    try {
      const { doctorID, callId, longitude, latitude, address, comments } = req.body || {};

      const resolvedCallId = doctorID ?? callId;
      const callIdNum = Number(resolvedCallId);
      const lonNum = Number(longitude);
      const latNum = Number(latitude);

      if (!Number.isFinite(callIdNum)) {
        return res.status(400).json({ success: false, message: 'doctorID (callId) is required and must be a valid number.' });
      }

      if (!Number.isFinite(lonNum) || !Number.isFinite(latNum)) {
        return res.status(400).json({ success: false, message: 'longitude and latitude are required and must be valid numbers.' });
      }

      if (latNum < -90 || latNum > 90) {
        return res.status(400).json({ success: false, message: 'latitude must be between -90 and 90 degrees.' });
      }

      if (lonNum < -180 || lonNum > 180) {
        return res.status(400).json({ success: false, message: 'longitude must be between -180 and 180 degrees.' });
      }

      const doctorExists = await dbQuery(
        'SELECT d.id, d.userID, d.drName, d.address, d.speciality, d.cityID FROM drcalls d WHERE d.id = ? LIMIT 1',
        [callIdNum]
      );
      if (!Array.isArray(doctorExists) || !doctorExists.length) {
        return res.status(404).json({ success: false, message: 'Doctor not found.' });
      }

      const normalizedAddress = typeof address === 'string' && address.trim().length
        ? address.trim().slice(0, 255)
        : null;

      const normalizedComments = typeof comments === 'string' && comments.trim().length
        ? comments.trim().slice(0, 2000)
        : null;

      await dbQuery(
        `INSERT INTO drworklog (callId, longitude, latitude, address, comments)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           longitude = VALUES(longitude),
           latitude = VALUES(latitude),
           address = VALUES(address),
           comments = VALUES(comments),
           createdDate = CURRENT_TIMESTAMP` ,
        [
          callIdNum,
          Number(lonNum.toFixed(6)),
          Number(latNum.toFixed(6)),
          normalizedAddress,
          normalizedComments
        ]
      );

      const [record] = await dbQuery(
        `SELECT w.callId,
                w.longitude,
                w.latitude,
                w.address,
                w.comments,
                w.createdDate,
                d.drName AS doctorName,
                d.address AS doctorAddress,
                d.speciality,
                pc.category_name AS specialityName,
                d.userID AS representativeId,
                city.city AS cityName,
                city.state AS stateName
         FROM drworklog w
         INNER JOIN drcalls d ON d.id = w.callId
         LEFT JOIN productcategory pc ON pc.id = d.speciality
         LEFT JOIN city ON city.id = d.cityID
         WHERE w.callId = ?
         LIMIT 1`,
        [callIdNum]
      );

      return res.status(201).json({
        success: true,
        message: 'Doctor work log recorded successfully.',
        data: record || null
      });
    } catch (error) {
      console.error('Error creating doctor work log entry:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record doctor work log entry.',
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
        `SELECT DATE_FORMAT(w.createdDate, '%Y-%m') AS yearMonth,
                COUNT(*) AS entryCount
         FROM drworklog w
         INNER JOIN drcalls d ON w.callId = d.id
         WHERE d.userID = ?
           AND w.createdDate >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
         GROUP BY yearMonth
         ORDER BY yearMonth ASC`,
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
        message: 'Doctor work log summary fetched successfully.',
        data: summary
      });
    } catch (error) {
      console.error('Error fetching doctor work log summary:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch doctor work log summary.',
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

      if (typeof yearMonth !== 'string' || !/^[0-9]{4}-[0-9]{2}$/.test(yearMonth)) {
        return res.status(400).json({ success: false, message: 'yearMonth must be in YYYY-MM format.' });
      }

      const logs = await dbQuery(
        `SELECT w.callId,
                w.longitude,
                w.latitude,
                w.address,
                w.comments,
                w.createdDate,
                d.drName AS doctorName,
                d.address AS doctorAddress,
                d.cityID,
                city.city AS cityName,
                city.state AS stateName,
                d.speciality,
                pc.category_name AS specialityName,
                rep.name AS representativeName,
                rep.phone AS representativePhone
         FROM drworklog w
         INNER JOIN drcalls d ON w.callId = d.id
         LEFT JOIN productcategory pc ON pc.id = d.speciality
         LEFT JOIN city ON city.id = d.cityID
         LEFT JOIN users rep ON rep.id = d.userID
         WHERE d.userID = ?
           AND DATE_FORMAT(w.createdDate, '%Y-%m') = ?
         ORDER BY w.createdDate DESC`,
        [repIdNum, yearMonth]
      );

      return res.status(200).json({
        success: true,
        message: 'Doctor work log entries fetched successfully.',
        data: Array.isArray(logs) ? logs : []
      });
    } catch (error) {
      console.error('Error fetching doctor work log entries:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch doctor work log entries.',
        error: error.message
      });
    }
  }
}

module.exports = new DrWorkLogController();
