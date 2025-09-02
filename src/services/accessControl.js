// Simple page-level access control based on designation (domain table)
// You can later move this mapping to a DB table if needed.

// Module keys should match your page/module identifiers
// e.g., 'dashboard', 'orders', 'collections', 'payments', 'users', 'products', 'counters', 'reports'
const ROLE_ACCESS = {
  // Example mapping: adjust IDs/names to your designation table
  // 1: Admin, 2: Manager, 3: Staff, 4: Accountant
  1: ['dashboard', 'orders', 'collections', 'payments', 'users', 'products', 'counters', 'reports', 'page-access'],
  2: ['dashboard', 'orders', 'collections', 'payments', 'products', 'counters', 'reports', 'page-access'],
  3: ['dashboard', 'orders', 'collections', 'products', 'page-access'],
  4: ['dashboard', 'payments', 'reports', 'page-access']
};

function getAllowedModules(designationId) {
  if (!designationId) return [];
  const id = Number(designationId);
  const base = ROLE_ACCESS[id];
  // If designation not mapped, at least allow page-access so admins can configure
  return Array.isArray(base) ? base : ['page-access'];
}

function canAccess(designationId, moduleKey) {
  const allowed = getAllowedModules(designationId);
  return allowed.includes(moduleKey);
}

module.exports = { getAllowedModules, canAccess };
