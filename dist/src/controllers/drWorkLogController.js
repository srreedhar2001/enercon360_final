const { query: dbQuery } = require('../config/database');

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

let drWorkLogSchemaReady = false;
let drWorkLogSchemaPromise = null;

async function ensureDrWorkLogSchemaSupportsMultipleEntries() {
  if (drWorkLogSchemaReady) {
    return true;
  }
  if (drWorkLogSchemaPromise) {
    return drWorkLogSchemaPromise;
  }

  drWorkLogSchemaPromise = (async () => {
    let hasIdColumn = false;
    try {
      const columns = await dbQuery("SHOW COLUMNS FROM drworklog LIKE 'id'");
      hasIdColumn = Array.isArray(columns) && columns.length > 0;
    } catch (error) {
      console.error('Unable to inspect drworklog table structure:', error);
      throw error;
    }

    if (!hasIdColumn) {
      try {
        await dbQuery(`
          ALTER TABLE drworklog
            DROP PRIMARY KEY,
            ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST
        `);
      } catch (alterError) {
        console.error('Failed to update drworklog table to support multiple visits:', alterError);
        throw alterError;
      }

      try {
        await dbQuery('ALTER TABLE drworklog ADD INDEX idx_drworklog_callId (callId)');
      } catch (indexError) {
        if (indexError?.code !== 'ER_DUP_KEYNAME') {
          console.warn('Failed to add idx_drworklog_callId index:', indexError);
          throw indexError;
        }
      }
    }

    drWorkLogSchemaReady = true;
    return true;
  })();

  try {
    return await drWorkLogSchemaPromise;
  } catch (error) {
    drWorkLogSchemaPromise = null;
    throw error;
  }
}

function formatDateOnly(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return formatDateOnly(new Date(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!DATE_ONLY_REGEX.test(trimmed)) {
      return null;
    }
    const [yearStr, monthStr, dayStr] = trimmed.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return formatDateOnly(date);
  }
  return null;
}

function getDefaultDateRange() {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return {
    from: formatDateOnly(start),
    to: formatDateOnly(end)
  };
}

class DrWorkLogController {
  async createDoctorLog(req, res) {
    try {
      await ensureDrWorkLogSchemaSupportsMultipleEntries();
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

      let insertResult;
      try {
        insertResult = await dbQuery(
          `INSERT INTO drworklog (callId, longitude, latitude, address, comments)
           VALUES (?, ?, ?, ?, ?)` ,
          [
            callIdNum,
            Number(lonNum.toFixed(6)),
            Number(latNum.toFixed(6)),
            normalizedAddress,
            normalizedComments
          ]
        );
      } catch (insertError) {
        if (insertError?.code === 'ER_DUP_ENTRY') {
          try {
            await ensureDrWorkLogSchemaSupportsMultipleEntries();
            insertResult = await dbQuery(
              `INSERT INTO drworklog (callId, longitude, latitude, address, comments)
               VALUES (?, ?, ?, ?, ?)` ,
              [
                callIdNum,
                Number(lonNum.toFixed(6)),
                Number(latNum.toFixed(6)),
                normalizedAddress,
                normalizedComments
              ]
            );
          } catch (retryError) {
            if (retryError?.code === 'ER_DUP_ENTRY') {
              console.error('Duplicate entry persists after schema upgrade attempt for doctor work log:', retryError);
              return res.status(409).json({
                success: false,
                message: 'Unable to record multiple doctor visits because the drworklog table still enforces unique call IDs. Please contact the administrator to update the table schema.'
              });
            }
            throw retryError;
          }
        } else {
          throw insertError;
        }
      }

      const insertedId = insertResult?.insertId;
      let record = null;

      if (insertedId) {
        const rows = await dbQuery(
          `SELECT w.id AS logId,
                  w.callId,
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
           WHERE w.id = ?
           LIMIT 1`,
          [insertedId]
        );
        if (Array.isArray(rows) && rows.length) {
          record = rows[0];
        }
      }

      if (!record) {
        const rows = await dbQuery(
          `SELECT w.id AS logId,
                  w.callId,
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
           ORDER BY w.createdDate DESC
           LIMIT 1`,
          [callIdNum]
        );
        if (Array.isArray(rows) && rows.length) {
          record = rows[0];
        }
      }

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
      await ensureDrWorkLogSchemaSupportsMultipleEntries();
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
      await ensureDrWorkLogSchemaSupportsMultipleEntries();
      const { repId, yearMonth } = req.params || {};
      const repIdNum = Number(repId);

      if (!Number.isFinite(repIdNum)) {
        return res.status(400).json({ success: false, message: 'repId must be a valid number.' });
      }

      if (typeof yearMonth !== 'string' || !/^[0-9]{4}-[0-9]{2}$/.test(yearMonth)) {
        return res.status(400).json({ success: false, message: 'yearMonth must be in YYYY-MM format.' });
      }

      const logs = await dbQuery(
  `SELECT w.id AS logId,
    w.callId,
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

  async getRepresentativeDoctorLogs(req, res) {
    try {
      await ensureDrWorkLogSchemaSupportsMultipleEntries();
      const { repId } = req.params || {};
      const { from, to } = req.query || {};
      const repIdNum = Number(repId);

      if (!Number.isFinite(repIdNum)) {
        return res.status(400).json({ success: false, message: 'repId must be a valid number.' });
      }

      const defaults = getDefaultDateRange();
      let rangeFrom = normalizeDateOnly(from) || defaults.from;
      let rangeTo = normalizeDateOnly(to) || defaults.to;

      if (!rangeFrom) {
        rangeFrom = defaults.from;
      }
      if (!rangeTo) {
        rangeTo = defaults.to;
      }

      if (rangeFrom > rangeTo) {
        const temp = rangeFrom;
        rangeFrom = rangeTo;
        rangeTo = temp;
      }

      // Convert IST date range to UTC datetime range
      // IST dates like '2026-01-01' should match data from UTC '2025-12-31 18:30:00' onwards
      const fromDateTime = `${rangeFrom} 00:00:00`;
      const toDateTime = `${rangeTo} 23:59:59`;

      // Increase GROUP_CONCAT limit to handle large number of visits
      await dbQuery('SET SESSION group_concat_max_len = 1000000');

      const doctorRows = await dbQuery(
        `SELECT d.id AS doctorId,
                d.drName AS doctorName,
                d.address AS doctorAddress,
                d.speciality,
                pc.category_name AS specialityName,
                city.city AS cityName,
                city.state AS stateName,
                COUNT(w.id) AS logCount,
                MAX(w.createdDate) AS lastLogDate,
                GROUP_CONCAT(
                  DATE_FORMAT(w.createdDate, '%Y-%m-%dT%H:%i:%s')
                  ORDER BY w.createdDate DESC
                  SEPARATOR ','
                ) AS visitDateList,
                GROUP_CONCAT(
                  CONCAT_WS('::',
                    DATE_FORMAT(w.createdDate, '%Y-%m-%dT%H:%i:%s'),
                    IFNULL(CAST(w.latitude AS CHAR), ''),
                    IFNULL(CAST(w.longitude AS CHAR), '')
                  )
                  ORDER BY w.createdDate DESC
                  SEPARATOR '||'
                ) AS visitMetaList
         FROM drcalls d
         LEFT JOIN drworklog w
           ON w.callId = d.id
          AND DATE(CONVERT_TZ(w.createdDate, '+00:00', '+05:30')) BETWEEN ? AND ?
         LEFT JOIN productcategory pc ON pc.id = d.speciality
         LEFT JOIN city ON city.id = d.cityID
         WHERE d.userID = ?
           AND d.status = 1
         GROUP BY d.id, d.drName, d.address, d.speciality, pc.category_name, city.city, city.state
         ORDER BY logCount DESC, d.drName ASC`,
        [rangeFrom, rangeTo, repIdNum]
      );

      const dailyRows = await dbQuery(
        `SELECT DATE(CONVERT_TZ(w.createdDate, '+00:00', '+05:30')) AS logDate,
                COUNT(*) AS visitCount
         FROM drworklog w
         INNER JOIN drcalls d ON d.id = w.callId
         WHERE d.userID = ?
           AND d.status = 1
           AND DATE(CONVERT_TZ(w.createdDate, '+00:00', '+05:30')) BETWEEN ? AND ?
         GROUP BY logDate
         ORDER BY logDate ASC`,
        [repIdNum, rangeFrom, rangeTo]
      );

      const doctors = Array.isArray(doctorRows)
        ? doctorRows.map((row) => {
            let lastLogIso = null;
            if (row.lastLogDate) {
              const parsed = row.lastLogDate instanceof Date ? row.lastLogDate : new Date(row.lastLogDate);
              if (!Number.isNaN(parsed.getTime())) {
                lastLogIso = parsed.toISOString();
              }
            }
            const visitMetaRaw = typeof row.visitMetaList === 'string' && row.visitMetaList.trim().length
              ? row.visitMetaList.split('||').map((entry) => entry.trim()).filter(Boolean)
              : [];

            const visitEntries = visitMetaRaw.map((entry) => {
              const parts = entry.split('::');
              const isoRaw = (parts[0] || '').trim();
              const latRaw = (parts[1] || '').trim();
              const lonRaw = (parts[2] || '').trim();

              const iso = isoRaw.length ? isoRaw : null;
              const latitude = latRaw.length ? Number(latRaw) : null;
              const longitude = lonRaw.length ? Number(lonRaw) : null;

              return {
                iso,
                latitude: Number.isFinite(latitude) ? latitude : null,
                longitude: Number.isFinite(longitude) ? longitude : null
              };
            }).filter((item) => Boolean(item.iso));

            const visitDates = visitEntries.length
              ? visitEntries.map((item) => item.iso)
              : (typeof row.visitDateList === 'string' && row.visitDateList.trim().length
                  ? row.visitDateList.split(',').map((dateStr) => dateStr.trim()).filter(Boolean)
                  : []);

            return {
              doctorId: row.doctorId,
              doctorName: row.doctorName || null,
              specialityName: row.specialityName || null,
              speciality: row.speciality || null,
              cityName: row.cityName || null,
              stateName: row.stateName || null,
              address: row.doctorAddress || null,
              logCount: Number(row.logCount) || 0,
              lastLogDate: lastLogIso,
              visitDates,
              visitEntries
            };
          })
        : [];

      const dailyCounts = Array.isArray(dailyRows)
        ? dailyRows.map((row) => {
            let dateOnly = null;
            if (row.logDate instanceof Date) {
              dateOnly = formatDateOnly(row.logDate);
            } else if (row.logDate) {
              const parsed = new Date(row.logDate);
              if (!Number.isNaN(parsed.getTime())) {
                dateOnly = formatDateOnly(parsed);
              } else if (typeof row.logDate === 'string') {
                const trimmed = row.logDate.trim();
                if (DATE_ONLY_REGEX.test(trimmed)) {
                  dateOnly = trimmed;
                }
              }
            }
            return {
              date: dateOnly,
              count: Number(row.visitCount) || 0
            };
          }).filter((item) => Boolean(item.date))
        : [];

      const visitCount = doctors.reduce((sum, row) => sum + (Number(row.logCount) || 0), 0);
      
      // Get doctor visit target from environment variable
      const doctorVisitTarget = Number(process.env.DOCTOR_VISIT) || 200;

      return res.status(200).json({
        success: true,
        message: 'Doctor work logs fetched successfully.',
        data: {
          range: { from: rangeFrom, to: rangeTo },
          doctors,
          dailyCounts,
          totals: {
            doctorCount: doctors.length,
            visitCount,
            doctorVisitTarget
          }
        }
      });
    } catch (error) {
      console.error('Error fetching representative doctor logs:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch representative doctor logs.',
        error: error.message
      });
    }
  }
}

module.exports = new DrWorkLogController();
