// ---------------------------------------------------------------------------
// localStorage layer — versioned, multi-project, schema-migrated
// ---------------------------------------------------------------------------

const KEY_DB = 'cta.db.v2';          // { schemaVersion, projects:{id->project}, activeProjectId }
const KEY_VERSIONS = 'cta.versions.v2'; // { [projectId]: version[] }
const KEY_SETTINGS = 'cta.settings.v1';
const KEY_TOASTS = 'cta.toasts.v1';

// Legacy keys
const LEGACY_PROJECT = 'cta.project.v1';
const LEGACY_VERSIONS = 'cta.versions.v1';

const SCHEMA_VERSION = 2;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[storage] write failed', key, e);
    return false;
  }
}

function emptyDb() {
  return { schemaVersion: SCHEMA_VERSION, projects: {}, activeProjectId: null };
}

export function loadDb() {
  let db = read(KEY_DB, null);
  if (!db) db = migrateFromLegacy();
  if (!db) db = emptyDb();
  if (!db.projects) db.projects = {};
  if (!db.schemaVersion) db.schemaVersion = SCHEMA_VERSION;
  return db;
}

function migrateFromLegacy() {
  const legacy = read(LEGACY_PROJECT, null);
  if (!legacy) return null;
  const db = emptyDb();
  const id = legacy.id || `proj_${Date.now().toString(36)}`;
  db.projects[id] = { ...legacy, id };
  db.activeProjectId = id;
  write(KEY_DB, db);
  // also migrate versions
  const legacyVers = read(LEGACY_VERSIONS, null);
  if (legacyVers && Array.isArray(legacyVers)) {
    write(KEY_VERSIONS, { [id]: legacyVers });
  }
  try {
    localStorage.removeItem(LEGACY_PROJECT);
    localStorage.removeItem(LEGACY_VERSIONS);
  } catch {}
  return db;
}

export function saveDb(db) {
  write(KEY_DB, { ...db, savedAt: new Date().toISOString() });
}

// Project-level ----------------------------------------------------------------
export function upsertProject(project) {
  const db = loadDb();
  db.projects[project.id] = { ...project, updatedAt: new Date().toISOString() };
  if (!db.activeProjectId) db.activeProjectId = project.id;
  saveDb(db);
  return db;
}

export function removeProject(projectId) {
  const db = loadDb();
  delete db.projects[projectId];
  if (db.activeProjectId === projectId) {
    const first = Object.keys(db.projects)[0] || null;
    db.activeProjectId = first;
  }
  saveDb(db);
  const vmap = loadVersionMap();
  delete vmap[projectId];
  write(KEY_VERSIONS, vmap);
  return db;
}

export function setActiveProject(projectId) {
  const db = loadDb();
  if (db.projects[projectId]) {
    db.activeProjectId = projectId;
    saveDb(db);
  }
  return db;
}

// Versions ---------------------------------------------------------------------
export function loadVersionMap() {
  return read(KEY_VERSIONS, {});
}
export function loadVersions(projectId) {
  const vmap = loadVersionMap();
  return vmap[projectId] || [];
}
export function saveVersion(projectId, label, snapshot) {
  const vmap = loadVersionMap();
  const list = vmap[projectId] || [];
  const v = {
    id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: label || `Version ${list.length + 1}`,
    createdAt: new Date().toISOString(),
    snapshot,
  };
  vmap[projectId] = [v, ...list];
  write(KEY_VERSIONS, vmap);
  return v;
}
export function renameVersion(projectId, versionId, label) {
  const vmap = loadVersionMap();
  vmap[projectId] = (vmap[projectId] || []).map((v) =>
    v.id === versionId ? { ...v, label } : v,
  );
  write(KEY_VERSIONS, vmap);
  return vmap[projectId];
}
export function deleteVersion(projectId, versionId) {
  const vmap = loadVersionMap();
  vmap[projectId] = (vmap[projectId] || []).filter((v) => v.id !== versionId);
  write(KEY_VERSIONS, vmap);
  return vmap[projectId];
}

// Settings ---------------------------------------------------------------------
export function saveSettings(settings) {
  write(KEY_SETTINGS, settings);
}
export function loadSettings() {
  return read(KEY_SETTINGS, null);
}

// Toast history ----------------------------------------------------------------
export function loadToastHistory() {
  return read(KEY_TOASTS, []);
}
export function pushToastHistory(entry) {
  const list = loadToastHistory();
  const next = [entry, ...list].slice(0, 50);
  write(KEY_TOASTS, next);
}
export function clearToastHistory() {
  write(KEY_TOASTS, []);
}

// Full export / import --------------------------------------------------------
export function fullExport() {
  return {
    schemaVersion: SCHEMA_VERSION,
    db: loadDb(),
    versions: loadVersionMap(),
    settings: loadSettings(),
    exportedAt: new Date().toISOString(),
  };
}
export function fullImport(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
  if (payload.db) write(KEY_DB, payload.db);
  if (payload.versions) write(KEY_VERSIONS, payload.versions);
  if (payload.settings) write(KEY_SETTINGS, payload.settings);
  return true;
}

// Erase -----------------------------------------------------------------------
export function clearAll() {
  [KEY_DB, KEY_VERSIONS, KEY_SETTINGS, KEY_TOASTS, LEGACY_PROJECT, LEGACY_VERSIONS].forEach(
    (k) => localStorage.removeItem(k),
  );
}
