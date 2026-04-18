// JSON import/export for the *active* project. This preserves everything
// (dependencies, groups, stations, VA flags, muda types, etc.) which Excel
// cannot.

import { clone, download, uid } from './utils.js';
import { fullExport, fullImport } from './storage.js';

export function projectToJson(project) {
  return {
    __type: 'cta.project',
    version: 1,
    exportedAt: new Date().toISOString(),
    project: clone(project),
  };
}

export function downloadProjectJson(project) {
  const payload = projectToJson(project);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  download(
    `${(project.name || 'project').replace(/\s+/g, '_')}.cta.json`,
    blob,
  );
}

export async function readProjectJsonFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (data?.__type === 'cta.project' && data.project) {
    const p = clone(data.project);
    // Give it a new id so imports don't collide with an existing project
    p.id = uid('proj');
    p.createdAt = new Date().toISOString();
    return p;
  }
  throw new Error('Not a Cycle Time Analyzer project JSON');
}

export function downloadFullBackup() {
  const payload = fullExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  download(`cta_backup_${Date.now()}.json`, blob);
}

export async function restoreFullBackup(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  fullImport(data);
  return true;
}
