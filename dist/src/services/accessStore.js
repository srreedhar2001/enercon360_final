const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'access.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify({ designations: {} }, null, 2));
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(STORE_PATH, 'utf-8');
  return JSON.parse(raw || '{"designations":{}}');
}

function writeStore(data) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function getPermissions(designationId) {
  const store = readStore();
  const id = String(designationId);
  return store.designations[id]?.permissions || null;
}

function setPermissions(designationId, permissions) {
  const store = readStore();
  const id = String(designationId);
  if (!store.designations[id]) store.designations[id] = {};
  store.designations[id].permissions = permissions || {};
  writeStore(store);
  return true;
}

module.exports = { getPermissions, setPermissions };
