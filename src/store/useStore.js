import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  loadDb,
  upsertProject,
  removeProject as storageRemoveProject,
  setActiveProject as storageSetActiveProject,
  saveSettings,
  loadSettings,
  loadVersions,
  loadVersionMap,
  saveVersion as persistVersion,
  deleteVersion as storageDeleteVersion,
  renameVersion as storageRenameVersion,
  loadToastHistory,
  pushToastHistory,
  clearToastHistory,
} from '../lib/storage.js';
import { uid, clone } from '../lib/utils.js';
import { computeSchedule } from '../lib/engine.js';
import { makeTemplateSteps, TEMPLATES } from '../lib/templates.js';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function newStep(partial = {}) {
  return {
    id: uid('s'),
    name: partial.name || 'New Step',
    machineTime: 0,
    operatorTime: 0,
    setupTime: 0,
    transferTime: 0,
    waitTime: 0,
    startTime: 0,
    endTime: 0,
    cycleTime: 0,
    groupId: null,
    dependencies: [],
    isValueAdded: true,
    stationId: null,
    variability: 0,
    cost: 0,
    mudaType: null,
    ...partial,
  };
}

const DEFAULT_SETTINGS = {
  timeUnit: 'seconds',
  defaultTaktTime: 60,
  stationCount: 4,
  currency: 'USD',
  labourRate: 0,
  showHeatmap: false,
  autoSave: true,
  oee: { availability: 0.9, performance: 0.95, quality: 0.99 },
  precision: 1,
  sidebarCollapsed: false,
};

function freshProject(templateId = 'cnc-machining', name) {
  const { steps, taktTime } = makeTemplateSteps(templateId);
  const t = TEMPLATES.find((x) => x.id === templateId);
  return {
    id: uid('proj'),
    name: name || t?.name || 'Untitled Project',
    createdAt: new Date().toISOString(),
    taktTime,
    steps,
    baselineSteps: clone(steps),
    simulationSteps: clone(steps),
    lines: [],
    notes: '',
  };
}

// ---------------------------------------------------------------------------
// Bootstrap: load DB, seed default project if empty
// ---------------------------------------------------------------------------

function bootstrap() {
  let db = loadDb();
  if (!db.projects || Object.keys(db.projects).length === 0) {
    const p = freshProject();
    db = upsertProject(p);
    db = storageSetActiveProject(p.id);
  }
  const activeId = db.activeProjectId || Object.keys(db.projects)[0];
  return { db, activeProjectId: activeId };
}

const bootstrapped = bootstrap();
const persistedSettings = loadSettings();

// ---------------------------------------------------------------------------
// Undo / redo — per-project ring buffer of (steps, taktTime)
// ---------------------------------------------------------------------------

const UNDO_LIMIT = 80;

function snapshotOf(project) {
  return {
    taktTime: project.taktTime,
    steps: clone(project.steps),
    name: project.name,
    notes: project.notes,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStore = create(
  subscribeWithSelector((set, get) => ({
    // DB & active project ---------------------------------------------------
    db: bootstrapped.db,
    activeProjectId: bootstrapped.activeProjectId,

    settings: { ...DEFAULT_SETTINGS, ...(persistedSettings || {}) },

    // Per-project undo stacks
    undoStacks: {},
    redoStacks: {},

    // Ephemeral UI state
    toast: null,
    toastHistory: loadToastHistory(),
    commandPaletteOpen: false,
    shortcutsOpen: false,
    onboardingSeen: !!(persistedSettings?.onboardingSeen),

    // Selectors -------------------------------------------------------------
    getActiveProject() {
      const { db, activeProjectId } = get();
      return db.projects[activeProjectId];
    },
    getProjects() {
      return Object.values(get().db.projects).sort(
        (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
      );
    },
    getVersions() {
      return loadVersions(get().activeProjectId);
    },
    getSchedule() {
      return computeSchedule(get().getActiveProject()?.steps || []);
    },

    // Generic undo-aware project mutator
    patchActiveProject(fn, options = {}) {
      const { pushUndo = true } = options;
      const { db, activeProjectId, undoStacks, redoStacks } = get();
      const prev = db.projects[activeProjectId];
      if (!prev) return;
      const next = fn(prev);
      if (!next || next === prev) return;

      let undo = undoStacks[activeProjectId] || [];
      let redo = redoStacks[activeProjectId] || [];
      if (pushUndo) {
        undo = [...undo, snapshotOf(prev)].slice(-UNDO_LIMIT);
        redo = [];
      }

      const updatedDb = {
        ...db,
        projects: { ...db.projects, [activeProjectId]: next },
      };
      set({
        db: updatedDb,
        undoStacks: { ...undoStacks, [activeProjectId]: undo },
        redoStacks: { ...redoStacks, [activeProjectId]: redo },
      });
    },

    undo() {
      const { db, activeProjectId, undoStacks, redoStacks } = get();
      const stack = undoStacks[activeProjectId] || [];
      if (!stack.length) return;
      const prev = db.projects[activeProjectId];
      const snap = stack[stack.length - 1];
      const nextRedo = [...(redoStacks[activeProjectId] || []), snapshotOf(prev)].slice(-UNDO_LIMIT);
      const nextUndo = stack.slice(0, -1);

      const updated = {
        ...prev,
        steps: clone(snap.steps),
        taktTime: snap.taktTime,
        name: snap.name,
        notes: snap.notes,
      };
      set({
        db: { ...db, projects: { ...db.projects, [activeProjectId]: updated } },
        undoStacks: { ...undoStacks, [activeProjectId]: nextUndo },
        redoStacks: { ...redoStacks, [activeProjectId]: nextRedo },
      });
    },

    redo() {
      const { db, activeProjectId, undoStacks, redoStacks } = get();
      const stack = redoStacks[activeProjectId] || [];
      if (!stack.length) return;
      const prev = db.projects[activeProjectId];
      const snap = stack[stack.length - 1];
      const nextUndo = [...(undoStacks[activeProjectId] || []), snapshotOf(prev)].slice(-UNDO_LIMIT);
      const nextRedo = stack.slice(0, -1);

      const updated = {
        ...prev,
        steps: clone(snap.steps),
        taktTime: snap.taktTime,
        name: snap.name,
        notes: snap.notes,
      };
      set({
        db: { ...db, projects: { ...db.projects, [activeProjectId]: updated } },
        undoStacks: { ...undoStacks, [activeProjectId]: nextUndo },
        redoStacks: { ...redoStacks, [activeProjectId]: nextRedo },
      });
    },

    canUndo() {
      return (get().undoStacks[get().activeProjectId] || []).length > 0;
    },
    canRedo() {
      return (get().redoStacks[get().activeProjectId] || []).length > 0;
    },

    // Project CRUD ----------------------------------------------------------
    createProject(templateId = 'cnc-machining', name) {
      const p = freshProject(templateId, name);
      const db = upsertProject(p);
      set({ db, activeProjectId: p.id });
      return p;
    },
    duplicateProject(projectId) {
      const src = get().db.projects[projectId];
      if (!src) return;
      const copy = {
        ...clone(src),
        id: uid('proj'),
        name: src.name + ' (copy)',
        createdAt: new Date().toISOString(),
      };
      const db = upsertProject(copy);
      set({ db, activeProjectId: copy.id });
      return copy;
    },
    renameProject(projectId, name) {
      get().patchActiveProjectById(projectId, (p) => ({ ...p, name }));
    },
    removeProject(projectId) {
      const db = storageRemoveProject(projectId);
      const activeProjectId = db.activeProjectId || Object.keys(db.projects)[0];
      set({ db, activeProjectId });
    },
    setActiveProject(projectId) {
      const db = storageSetActiveProject(projectId);
      set({ db, activeProjectId: projectId });
    },
    patchActiveProjectById(projectId, fn) {
      const { db } = get();
      const prev = db.projects[projectId];
      if (!prev) return;
      const next = fn(prev);
      set({ db: { ...db, projects: { ...db.projects, [projectId]: next } } });
    },

    setProjectName(name) {
      get().patchActiveProject((p) => ({ ...p, name }));
    },
    setProjectNotes(notes) {
      get().patchActiveProject((p) => ({ ...p, notes }));
    },
    setTaktTime(value) {
      get().patchActiveProject((p) => ({ ...p, taktTime: Number(value) || 0 }));
    },

    resetProject() {
      const fresh = freshProject();
      get().patchActiveProject((p) => ({ ...fresh, id: p.id, name: p.name }));
    },

    loadTemplateIntoActive(templateId) {
      const { steps, taktTime } = makeTemplateSteps(templateId);
      if (!steps.length) return;
      get().patchActiveProject((p) => ({
        ...p,
        taktTime,
        steps,
        baselineSteps: clone(steps),
        simulationSteps: clone(steps),
      }));
    },

    // Steps CRUD ------------------------------------------------------------
    addStep(partial = {}) {
      const step = newStep(partial);
      get().patchActiveProject((p) => ({ ...p, steps: [...p.steps, step] }));
      return step;
    },
    insertStepAfter(refId, partial = {}) {
      const step = newStep({ ...partial, dependencies: [refId] });
      get().patchActiveProject((p) => {
        const idx = p.steps.findIndex((s) => s.id === refId);
        const next = [...p.steps];
        if (idx >= 0) next.splice(idx + 1, 0, step);
        else next.push(step);
        return { ...p, steps: next };
      });
      return step;
    },
    updateStep(id, patch, opts = {}) {
      get().patchActiveProject(
        (p) => ({
          ...p,
          steps: p.steps.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        }),
        opts,
      );
    },
    removeStep(id) {
      get().patchActiveProject((p) => ({
        ...p,
        steps: p.steps
          .filter((x) => x.id !== id)
          .map((x) => ({
            ...x,
            dependencies: (x.dependencies || []).filter((d) => d !== id),
          })),
      }));
    },
    removeSteps(ids) {
      const set = new Set(ids);
      get().patchActiveProject((p) => ({
        ...p,
        steps: p.steps
          .filter((x) => !set.has(x.id))
          .map((x) => ({
            ...x,
            dependencies: (x.dependencies || []).filter((d) => !set.has(d)),
          })),
      }));
    },
    duplicateStep(id) {
      const src = get().getActiveProject().steps.find((x) => x.id === id);
      if (!src) return;
      const copy = newStep({ ...src, id: undefined, name: src.name + ' (copy)' });
      get().patchActiveProject((p) => {
        const idx = p.steps.findIndex((s) => s.id === id);
        const next = [...p.steps];
        next.splice(idx + 1, 0, copy);
        return { ...p, steps: next };
      });
    },
    reorderSteps(nextIds) {
      get().patchActiveProject((p) => {
        const map = new Map(p.steps.map((x) => [x.id, x]));
        const ordered = nextIds.map((id) => map.get(id)).filter(Boolean);
        const tail = p.steps.filter((x) => !nextIds.includes(x.id));
        return { ...p, steps: [...ordered, ...tail] };
      });
    },
    setGroup(ids, groupId) {
      const set = new Set(Array.isArray(ids) ? ids : [ids]);
      get().patchActiveProject((p) => ({
        ...p,
        steps: p.steps.map((x) => (set.has(x.id) ? { ...x, groupId: groupId || null } : x)),
      }));
    },
    setStation(ids, stationId) {
      const set = new Set(Array.isArray(ids) ? ids : [ids]);
      get().patchActiveProject((p) => ({
        ...p,
        steps: p.steps.map((x) =>
          set.has(x.id) ? { ...x, stationId: stationId || null } : x,
        ),
      }));
    },
    toggleValueAdded(id) {
      const s = get().getActiveProject().steps.find((x) => x.id === id);
      if (!s) return;
      get().updateStep(id, { isValueAdded: !s.isValueAdded });
    },
    setSteps(steps) {
      get().patchActiveProject((p) => ({ ...p, steps }));
    },

    // Baseline / simulation -------------------------------------------------
    captureBaseline() {
      get().patchActiveProject((p) => ({ ...p, baselineSteps: clone(p.steps) }), {
        pushUndo: false,
      });
    },
    copyToSimulation() {
      get().patchActiveProject((p) => ({ ...p, simulationSteps: clone(p.steps) }), {
        pushUndo: false,
      });
    },
    updateSimStep(id, patch) {
      get().patchActiveProject(
        (p) => ({
          ...p,
          simulationSteps: p.simulationSteps.map((x) =>
            x.id === id ? { ...x, ...patch } : x,
          ),
        }),
        { pushUndo: false },
      );
    },
    setSimulationSteps(steps) {
      get().patchActiveProject((p) => ({ ...p, simulationSteps: steps }), {
        pushUndo: false,
      });
    },
    applySimulation() {
      get().patchActiveProject((p) => ({ ...p, steps: clone(p.simulationSteps) }));
    },

    // Multi-line snapshots --------------------------------------------------
    saveAsLine(label) {
      const p = get().getActiveProject();
      const entry = {
        id: uid('line'),
        label: label || `Line ${(p.lines || []).length + 1}`,
        createdAt: new Date().toISOString(),
        steps: clone(p.steps),
        taktTime: p.taktTime,
      };
      get().patchActiveProject((x) => ({ ...x, lines: [entry, ...(x.lines || [])] }), {
        pushUndo: false,
      });
      return entry;
    },
    removeLine(id) {
      get().patchActiveProject(
        (p) => ({ ...p, lines: (p.lines || []).filter((l) => l.id !== id) }),
        { pushUndo: false },
      );
    },

    // Versions --------------------------------------------------------------
    saveVersion(label) {
      const p = get().getActiveProject();
      const snap = clone(p);
      const v = persistVersion(get().activeProjectId, label, snap);
      return v;
    },
    restoreVersion(versionId) {
      const list = loadVersions(get().activeProjectId);
      const v = list.find((x) => x.id === versionId);
      if (!v) return;
      get().patchActiveProject((_) => clone(v.snapshot));
    },
    renameVersion(versionId, label) {
      storageRenameVersion(get().activeProjectId, versionId, label);
      set({}); // force re-render; versions are read from storage each time
    },
    deleteVersion(versionId) {
      storageDeleteVersion(get().activeProjectId, versionId);
      set({});
    },

    // Settings --------------------------------------------------------------
    updateSettings(patch) {
      const next = { ...get().settings, ...patch };
      set({ settings: next });
      saveSettings(next);
    },
    toggleSidebar() {
      get().updateSettings({ sidebarCollapsed: !get().settings.sidebarCollapsed });
    },

    // UI --------------------------------------------------------------------
    setCommandPaletteOpen(v) {
      set({ commandPaletteOpen: !!v });
    },
    toggleCommandPalette() {
      set({ commandPaletteOpen: !get().commandPaletteOpen });
    },
    setShortcutsOpen(v) {
      set({ shortcutsOpen: !!v });
    },
    markOnboardingSeen() {
      set({ onboardingSeen: true });
      get().updateSettings({ onboardingSeen: true });
    },

    // Toast -----------------------------------------------------------------
    notify(message, tone = 'info') {
      const entry = { id: uid('t'), message, tone, at: Date.now() };
      pushToastHistory({ ...entry, when: new Date().toISOString() });
      set({
        toast: entry,
        toastHistory: [{ ...entry, when: new Date().toISOString() }, ...get().toastHistory].slice(0, 50),
      });
      setTimeout(() => {
        if (get().toast && get().toast.id === entry.id) set({ toast: null });
      }, 3400);
    },
    clearToasts() {
      clearToastHistory();
      set({ toastHistory: [] });
    },
  })),
);

// ---------------------------------------------------------------------------
// Auto-save whenever the DB changes (debounced by Zustand microtask batching)
// ---------------------------------------------------------------------------

useStore.subscribe(
  (s) => s.db,
  (db) => {
    try {
      const state = useStore.getState();
      if (!state.settings?.autoSave) return;
      // Write each project (it's cheap at our scale)
      Object.values(db.projects).forEach((p) => upsertProject(p));
    } catch (e) {
      console.warn('autosave failed', e);
    }
  },
);
