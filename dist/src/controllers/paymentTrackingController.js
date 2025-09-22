const { query: dbQuery } = require('../config/database');

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

module.exports = { listByOrder, addEntry };
