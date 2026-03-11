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
      `SELECT module_key AS moduleKey, module_name AS moduleName, category
       FROM access_modules
       WHERE is_active = 1
       ORDER BY sort_order ASC, module_name ASC`
    );

    const extras = [
      { moduleKey: 'dashboard', moduleName: 'Dashboard', category: 'reports' },
      { moduleKey: 'rep-sales-report', moduleName: 'Rep Sales Report', category: 'reports' },
      { moduleKey: 'sales-vs-exp-report', moduleName: 'Sales vs Expenses Report', category: 'reports' },
      { moduleKey: 'new-counters-report', moduleName: 'New Counters Report', category: 'reports' },
      { moduleKey: 'counters-due', moduleName: 'Counters Due', category: 'reports' },
      { moduleKey: 'work-log-report', moduleName: 'Work Log', category: 'reports' },
      { moduleKey: 'user-logs', moduleName: 'User Login Logs', category: 'reports' },
      { moduleKey: 'doctor-calls', moduleName: 'Doctor Management', category: 'reports' },
      { moduleKey: 'reports', moduleName: 'Reports', category: 'reports' },
      { moduleKey: 'my-orders', moduleName: 'My Orders', category: 'transactions' },
      { moduleKey: 'orders', moduleName: 'Orders', category: 'transactions' },
      { moduleKey: 'collections', moduleName: 'Collections', category: 'transactions' },
      { moduleKey: 'payments', moduleName: 'Payments', category: 'transactions' },
      { moduleKey: 'transactions', moduleName: 'Transactions', category: 'transactions' },
      { moduleKey: 'users', moduleName: 'Users', category: 'others' },
      { moduleKey: 'products', moduleName: 'Products', category: 'master' },
      { moduleKey: 'counters', moduleName: 'Counters', category: 'master' },
      { moduleKey: 'page-access', moduleName: 'Page Access', category: 'others' },
      { moduleKey: 'others', moduleName: 'Others', category: 'others' }
    ];

    const moduleMap = new Map();
    const addModule = (mod = {}) => {
      if (!mod.moduleKey) return;
      const key = String(mod.moduleKey).trim();
      if (!key) return;
      if (!moduleMap.has(key)) {
        moduleMap.set(key, {
          key,
          name: mod.moduleName || mod.name || key,
          category: mod.category || null
        });
      } else {
        const existing = moduleMap.get(key);
        if (!existing.category && mod.category) existing.category = mod.category;
        if (existing.name === existing.key && mod.moduleName) existing.name = mod.moduleName;
      }
    };

    (rows || []).forEach(addModule);
    extras.forEach(addModule);

    const modules = Array.from(moduleMap.values());
    return res.json({ success: true, data: modules });
  } catch (e) {
    console.error('Error fetching modules from DB', e);
    const fallback = [
      { key: 'dashboard', name: 'Dashboard', category: 'reports' },
      { key: 'rep-sales-report', name: 'Rep Sales Report', category: 'reports' },
      { key: 'sales-vs-exp-report', name: 'Sales vs Expenses Report', category: 'reports' },
      { key: 'new-counters-report', name: 'New Counters Report', category: 'reports' },
      { key: 'counters-due', name: 'Counters Due', category: 'reports' },
      { key: 'work-log-report', name: 'Work Log', category: 'reports' },
      { key: 'user-logs', name: 'User Login Logs', category: 'reports' },
      { key: 'doctor-calls', name: 'Doctor Management', category: 'reports' },
      { key: 'reports', name: 'Reports', category: 'reports' },
      { key: 'orders', name: 'Orders', category: 'transactions' },
      { key: 'my-orders', name: 'My Orders', category: 'transactions' },
      { key: 'collections', name: 'Collections', category: 'transactions' },
      { key: 'payments', name: 'Payments', category: 'transactions' },
      { key: 'transactions', name: 'Transactions', category: 'transactions' },
      { key: 'users', name: 'Users', category: 'others' },
      { key: 'page-access', name: 'Page Access', category: 'others' },
      { key: 'others', name: 'Others', category: 'others' },
      { key: 'products', name: 'Products', category: 'master' },
      { key: 'counters', name: 'Counters', category: 'master' }
    ];
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
