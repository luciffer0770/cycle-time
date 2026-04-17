const KEY_PROJECT = 'cta.project.v1';
const KEY_VERSIONS = 'cta.versions.v1';
const KEY_SETTINGS = 'cta.settings.v1';

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[storage] failed', key, e);
    return false;
  }
}

export function saveProject(project) {
  const payload = {
    ...project,
    savedAt: new Date().toISOString(),
  };
  safeSet(KEY_PROJECT, payload);
  return payload;
}

export function loadProject() {
  return safeGet(KEY_PROJECT, null);
}

export function saveVersion(label, snapshot) {
  const versions = safeGet(KEY_VERSIONS, []);
  const version = {
    id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: label || `Version ${versions.length + 1}`,
    createdAt: new Date().toISOString(),
    snapshot,
  };
  versions.unshift(version);
  safeSet(KEY_VERSIONS, versions);
  return version;
}

export function loadVersions() {
  return safeGet(KEY_VERSIONS, []);
}

export function deleteVersion(id) {
  const versions = safeGet(KEY_VERSIONS, []).filter((v) => v.id !== id);
  safeSet(KEY_VERSIONS, versions);
  return versions;
}

export function saveSettings(settings) {
  safeSet(KEY_SETTINGS, settings);
}

export function loadSettings() {
  return safeGet(KEY_SETTINGS, null);
}

export function clearAll() {
  localStorage.removeItem(KEY_PROJECT);
  localStorage.removeItem(KEY_VERSIONS);
  localStorage.removeItem(KEY_SETTINGS);
}
