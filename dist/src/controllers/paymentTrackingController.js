const { query: dbQuery } = require('../config/database');

// Get latest tracking entry for multiple orders
async function getLatest(req, res) {
  try {
    const { orderIds } = req.query;
    if (!orderIds) return res.status(400).json({ success: false, message: 'orderIds is required' });
    
    const ids = orderIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ids.length === 0) return res.json({ success: true, data: [] });

    // Create placeholders for IN clause
    const placeholders = ids.map(() => '?').join(',');
    
    // Get latest comment for each order
    const rows = await dbQuery(
      `SELECT pt1.id, pt1.orderID, pt1.loggedInUserName, pt1.commentDate, pt1.comment, pt1.nextFollowUpDate
       FROM paymentTracking pt1
       INNER JOIN (
         SELECT orderID, MAX(commentDate) as maxDate
         FROM paymentTracking
         WHERE orderID IN (${placeholders})
         GROUP BY orderID
       ) pt2 ON pt1.orderID = pt2.orderID AND pt1.commentDate = pt2.maxDate
       ORDER BY pt1.orderID`,
      ids
    );
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('paymentTracking getLatest error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch latest comments' });
  }
}

// List tracking entries for a specific order
async function listByOrder(req, res) {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' });
    // Ensure order exists
    const [order] = await dbQuery('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const rows = await dbQuery(
      `SELECT id, orderID, loggedInUserName, commentDate, comment, nextFollowUpDate, createdAt, updatedAt
       FROM paymentTracking WHERE orderID = ?
       ORDER BY commentDate DESC, id DESC`,
      [orderId]
    );
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (e) {
    console.error('paymentTracking listByOrder error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch payment status' });
  }
}

// Add a new tracking entry
async function addEntry(req, res) {
  try {
    const { orderID, comment, nextFollowUpDate } = req.body || {};
    if (!orderID || !comment) {
      return res.status(400).json({ success: false, message: 'orderID and comment are required' });
    }
    // Ensure order exists
    const [order] = await dbQuery('SELECT id FROM orders WHERE id = ?', [orderID]);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const userName = (req.user && (req.user.name || req.user.mobile || req.user.email)) || 'Unknown';

    const result = await dbQuery(
      `INSERT INTO paymentTracking (orderID, loggedInUserName, comment, nextFollowUpDate, commentDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [orderID, userName, comment, nextFollowUpDate || null]
    );

    return res.status(201).json({ success: true, message: 'Payment status recorded', data: { id: result.insertId } });
  } catch (e) {
    console.error('paymentTracking addEntry error:', e);
    return res.status(500).json({ success: false, message: 'Failed to save payment status' });
  }
}

module.exports = { listByOrder, addEntry, getLatest };
