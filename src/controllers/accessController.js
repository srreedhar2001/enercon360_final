const { query: dbQuery } = require('../config/database');
const { getAllowedModules } = require('../services/accessControl');
const { getPermissions, setPermissions } = require('../services/accessStore');

// Assumes verifyToken set req.user.mobile or req.user.id; adapt as per your auth payload
const getMyAccess = async (req, res) => {
  try {
    // Fetch user designation by mobile or id from token
    // Adjust according to your verifyToken implementation
    const mobile = req.user?.mobile;
    const userId = req.user?.id;
    let user;

    if (userId) {
      const [u] = await dbQuery('SELECT id, name, designation_id FROM users WHERE id = ?', [userId]);
      user = u;
    } else if (mobile) {
      const [u] = await dbQuery('SELECT id, name, designation_id FROM users WHERE phone = ?', [mobile]);
      user = u;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const allowed = getAllowedModules(user.designation_id);
    return res.json({ success: true, data: { userId: user.id, designation_id: user.designation_id, modules: allowed } });
  } catch (err) {
    console.error('Error fetching access:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch access' });
  }
};

module.exports = { getMyAccess };
// New: list designations from DB (id, name)
const listDesignations = async (req, res) => {
  try {
    const rows = await dbQuery('SELECT id, name FROM designation ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Error fetching designations', e);
    res.status(500).json({ success: false, message: 'Failed to fetch designations' });
  }
};

// New: list modules from DB (fallback to static if needed)
const listModules = async (req, res) => {
  try {
    const rows = await dbQuery(
      `SELECT module_key AS moduleKey
       FROM access_modules
       WHERE is_active = 1
       ORDER BY sort_order ASC, module_name ASC`
    );
    const modules = (rows || []).map(r => r.moduleKey);
    return res.json({ success: true, data: modules });
  } catch (e) {
    console.error('Error fetching modules from DB', e);
    // Fallback to the previous static list so UI still works
    const fallback = ['dashboard','orders','collections','payments','users','products','counters','reports','page-access'];
    return res.status(200).json({ success: true, data: fallback });
  }
};

// New: get permissions for a designation (view/edit/delete per module)
const getDesignationPermissions = async (req, res) => {
  const { designationId } = req.params;
  try {
    const perms = getPermissions(designationId) || {};
    res.json({ success: true, data: perms });
  } catch (e) {
    console.error('Error reading permissions', e);
    res.status(500).json({ success: false, message: 'Failed to read permissions' });
  }
};

// New: set permissions for a designation
const setDesignationPermissions = async (req, res) => {
  const { designationId } = req.params;
  const permissions = req.body?.permissions || {};
  try {
    setPermissions(designationId, permissions);
    res.json({ success: true, message: 'Permissions saved' });
  } catch (e) {
    console.error('Error saving permissions', e);
    res.status(500).json({ success: false, message: 'Failed to save permissions' });
  }
};

module.exports = { getMyAccess, listDesignations, listModules, getDesignationPermissions, setDesignationPermissions };
