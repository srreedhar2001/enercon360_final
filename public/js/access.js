// Frontend helper to enforce page-level access based on designation
// Usage: call ensurePageAccess('moduleKey') early on each page.

function getToken() {
  // Read only; do not auto-create tokens. Explicit demo mode can set it separately.
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  return token || null;
}

async function fetchMyAccess() {
  try {
    let token = getToken();
    let res = await fetch('/api/access/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      // Retry once after ensuring demo token
      token = getToken();
      res = await fetch('/api/access/me', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) return null;
    }
    const data = await res.json();
    return data?.data?.modules || [];
  } catch (e) {
    console.error('Failed to fetch access', e);
    return null;
  }
}

async function ensurePageAccess(moduleKey) {
  const modules = await fetchMyAccess();
  if (!modules) {
    // If cannot verify, optionally redirect to login
    console.warn('Access check failed; redirecting to login');
    window.location.href = '/login.html';
    return;
  }
  if (!modules.includes(moduleKey)) {
    // Not authorized: redirect or show message
    window.location.href = '/index.html';
  }
}

window.ensurePageAccess = ensurePageAccess;

// Cached access bundle
window.__accessCache = window.__accessCache || { loaded: false, designationId: null, modules: [], permissions: {} };

async function loadAccessBundle() {
  if (window.__accessCache.loaded) return window.__accessCache;
  const token = getToken();
  // Get designation and modules
  const meRes = await fetch('/api/access/me', { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
  if (!meRes.ok) throw new Error('auth');
  const me = await meRes.json();
  const designationId = me?.data?.designation_id;
  const modules = me?.data?.modules || [];
  let permissions = {};
  if (designationId) {
    const pRes = await fetch(`/api/access/permissions/${designationId}`, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
    if (pRes.ok) {
      const pdata = await pRes.json();
      permissions = pdata?.data || {};
    }
  }
  window.__accessCache = { loaded: true, designationId, modules, permissions };
  return window.__accessCache;
}

async function hasPermission(moduleKey, action = 'view') {
  try {
    const bundle = await loadAccessBundle();
    const perms = bundle.permissions[moduleKey];
    if (perms && typeof perms[action] === 'boolean') return perms[action];
    // Fallback: allow view if module is listed in modules
    return action === 'view' && bundle.modules.includes(moduleKey);
  } catch (e) {
    return false;
  }
}

async function ensurePagePermission(moduleKey, action = 'view') {
  const ok = await hasPermission(moduleKey, action);
  if (!ok) {
    // if not permitted, send to home
    window.location.href = '/index.html';
  }
}

async function applyNavPermissions() {
  const links = document.querySelectorAll('.nav-link[data-page]');
  if (!links.length) return;
  let bundle = null;
  try {
    bundle = await loadAccessBundle();
  } catch (e) {
    // If we can't load access, hide all module links to be safe
    links.forEach(link => { link.style.display = 'none'; });
    return;
  }

  const perms = bundle.permissions || {};
  const allowedModules = new Set(bundle.modules || []);
  // Explicitly allow certain nav items regardless of backend modules,
  // so users can discover utility pages like Work Log.
  const ALWAYS_VISIBLE_LINKS = new Set(['work-log-report']);

  const isAllowed = (moduleKey) => {
    if (ALWAYS_VISIBLE_LINKS.has(moduleKey)) return true;
    const p = perms[moduleKey];
    return p && typeof p.view === 'boolean' ? p.view : allowedModules.has(moduleKey);
  };
  // Determine parent visibility states first
  const parentVisibility = new Map();
  links.forEach(link => {
    const mod = link.getAttribute('data-page');
    const ok = isAllowed(mod);
    parentVisibility.set(mod, !!ok);
  });

  // Ensure group parents (reports, others, transactions) are visible if any child is allowed
  const groupParents = ['reports', 'others', 'transactions'];
  groupParents.forEach(parentKey => {
    const groupEl = Array.from(document.querySelectorAll('.group'))
      .find(g => g.querySelector(`.nav-link[data-page="${parentKey}"]`));
    if (!groupEl) return;
    const childLinks = groupEl.querySelectorAll('.nav-link[data-page]');
    let anyChildAllowed = false;
    childLinks.forEach(cl => {
      const cmod = cl.getAttribute('data-page');
      if (cmod === parentKey) return; // skip parent button
      const cok = isAllowed(cmod);
      if (cok) anyChildAllowed = true;
    });
    if (anyChildAllowed) parentVisibility.set(parentKey, true);
  });

  links.forEach(link => {
    const mod = link.getAttribute('data-page');
    const parentWrapper = link.closest('.group');
    // If inside a group and the parent menu is visible, don't hide merely by child checks
    if (parentWrapper) {
      const parentButton = parentWrapper.querySelector('.nav-link[data-page]');
      const parentKey = parentButton ? parentButton.getAttribute('data-page') : null;
      if (parentKey && parentVisibility.get(parentKey)) {
        // Still hide individual child if not allowed
        if (mod !== parentKey) {
          const ok = isAllowed(mod);
          if (!ok) link.style.display = 'none';
          return;
        }
      }
    }
    let ok = isAllowed(mod);
    // For parent menus, use the computed parentVisibility
    if (['reports','others','transactions'].includes(mod)) {
      ok = !!parentVisibility.get(mod);
    }
    if (!ok) link.style.display = 'none';
  });
}

window.hasPermission = hasPermission;
window.ensurePagePermission = ensurePagePermission;
window.applyNavPermissions = applyNavPermissions;
