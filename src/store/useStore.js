import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  loadProject,
  saveProject,
  loadSettings,
  saveSettings,
  loadVersions,
  saveVersion as persistVersion,
  deleteVersion as removeVersion,
} from '../lib/storage.js';
import { uid, clone } from '../lib/utils.js';
import { computeSchedule } from '../lib/engine.js';
import { makeTemplateSteps } from '../lib/templates.js';

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
    ...partial,
  };
}

const DEFAULT_SETTINGS = {
  timeUnit: 'seconds',
  defaultTaktTime: 60,
  stationCount: 4,
  currency: 'USD',
  showHeatmap: false,
  autoSave: true,
  oee: { availability: 0.9, performance: 0.95, quality: 0.99 },
  precision: 1,
};

function freshProject() {
  const { steps, taktTime } = makeTemplateSteps('cnc-machining');
  return {
    id: uid('proj'),
    name: 'CNC Machining Cell',
    createdAt: new Date().toISOString(),
    taktTime,
    steps,
    baselineSteps: clone(steps),
    simulationSteps: clone(steps),
    lines: [],
  };
}

const persisted = loadProject();
const persistedSettings = loadSettings();

export const useStore = create(
  subscribeWithSelector((set, get) => ({
    // --- State ---------------------------------------------------------------
    ready: true,
    settings: { ...DEFAULT_SETTINGS, ...(persistedSettings || {}) },
    project: persisted || freshProject(),
    versions: loadVersions(),
    toast: null,

    // --- Project-level -------------------------------------------------------
    setProjectName(name) {
      set((s) => ({ project: { ...s.project, name } }));
    },
    setTaktTime(value) {
      set((s) => ({ project: { ...s.project, taktTime: Number(value) || 0 } }));
    },

    resetProject() {
      set({ project: freshProject() });
    },

    loadTemplate(templateId) {
      const { steps, taktTime } = makeTemplateSteps(templateId);
      if (!steps.length) return;
      set({
        project: {
          id: uid('proj'),
          name: templateId,
          createdAt: new Date().toISOString(),
          taktTime,
          steps,
          baselineSteps: clone(steps),
          simulationSteps: clone(steps),
          lines: [],
        },
      });
    },

    // --- Steps CRUD ----------------------------------------------------------
    addStep(partial = {}) {
      const step = newStep(partial);
      set((s) => ({ project: { ...s.project, steps: [...s.project.steps, step] } }));
      return step;
    },
    updateStep(id, patch) {
      set((s) => ({
        project: {
          ...s.project,
          steps: s.project.steps.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        },
      }));
    },
    removeStep(id) {
      set((s) => ({
        project: {
          ...s.project,
          steps: s.project.steps
            .filter((x) => x.id !== id)
            .map((x) => ({
              ...x,
              dependencies: (x.dependencies || []).filter((d) => d !== id),
            })),
        },
      }));
    },
    duplicateStep(id) {
      const src = get().project.steps.find((x) => x.id === id);
      if (!src) return;
      const copy = newStep({ ...src, id: undefined, name: src.name + ' (copy)' });
      set((s) => ({ project: { ...s.project, steps: [...s.project.steps, copy] } }));
    },
    reorderSteps(nextIds) {
      const map = new Map(get().project.steps.map((x) => [x.id, x]));
      const next = nextIds.map((id) => map.get(id)).filter(Boolean);
      const tail = get().project.steps.filter((x) => !nextIds.includes(x.id));
      set((s) => ({ project: { ...s.project, steps: [...next, ...tail] } }));
    },
    setDependencies(id, deps) {
      get().updateStep(id, { dependencies: deps });
    },
    toggleDependency(id, depId) {
      const s = get().project.steps.find((x) => x.id === id);
      if (!s) return;
      const has = (s.dependencies || []).includes(depId);
      get().updateStep(id, {
        dependencies: has
          ? s.dependencies.filter((d) => d !== depId)
          : [...(s.dependencies || []), depId],
      });
    },
    setGroup(id, groupId) {
      get().updateStep(id, { groupId: groupId || null });
    },
    setStation(id, stationId) {
      get().updateStep(id, { stationId: stationId || null });
    },
    toggleValueAdded(id) {
      const s = get().project.steps.find((x) => x.id === id);
      if (!s) return;
      get().updateStep(id, { isValueAdded: !s.isValueAdded });
    },

    // Bulk replace (used by Excel import, templates, auto-balance).
    setSteps(steps) {
      set((s) => ({ project: { ...s.project, steps } }));
    },

    // --- Baseline & Simulation ----------------------------------------------
    captureBaseline() {
      set((s) => ({ project: { ...s.project, baselineSteps: clone(s.project.steps) } }));
    },
    copyToSimulation() {
      set((s) => ({ project: { ...s.project, simulationSteps: clone(s.project.steps) } }));
    },
    updateSimStep(id, patch) {
      set((s) => ({
        project: {
          ...s.project,
          simulationSteps: s.project.simulationSteps.map((x) =>
            x.id === id ? { ...x, ...patch } : x,
          ),
        },
      }));
    },
    setSimulationSteps(steps) {
      set((s) => ({ project: { ...s.project, simulationSteps: steps } }));
    },
    applySimulation() {
      set((s) => ({ project: { ...s.project, steps: clone(s.project.simulationSteps) } }));
    },

    // --- Multi-line comparison ----------------------------------------------
    saveAsLine(label) {
      const snapshot = clone(get().project.steps);
      const entry = {
        id: uid('line'),
        label: label || `Line ${get().project.lines.length + 1}`,
        createdAt: new Date().toISOString(),
        steps: snapshot,
        taktTime: get().project.taktTime,
      };
      set((s) => ({ project: { ...s.project, lines: [entry, ...s.project.lines] } }));
      return entry;
    },
    removeLine(id) {
      set((s) => ({
        project: {
          ...s.project,
          lines: s.project.lines.filter((l) => l.id !== id),
        },
      }));
    },

    // --- Version control ----------------------------------------------------
    saveVersion(label) {
      const snapshot = clone(get().project);
      const v = persistVersion(label, snapshot);
      set({ versions: [v, ...get().versions] });
      return v;
    },
    restoreVersion(id) {
      const v = get().versions.find((x) => x.id === id);
      if (!v) return;
      set({ project: clone(v.snapshot) });
    },
    deleteVersion(id) {
      const next = removeVersion(id);
      set({ versions: next });
    },

    // --- Settings -----------------------------------------------------------
    updateSettings(patch) {
      const next = { ...get().settings, ...patch };
      set({ settings: next });
      saveSettings(next);
    },

    // --- Derived ------------------------------------------------------------
    getSchedule() {
      return computeSchedule(get().project.steps);
    },

    // --- Toast --------------------------------------------------------------
    notify(message, tone = 'info') {
      const id = uid('t');
      set({ toast: { id, message, tone, at: Date.now() } });
      setTimeout(() => {
        if (get().toast && get().toast.id === id) set({ toast: null });
      }, 3200);
    },
  })),
);

// Auto-save on project changes
useStore.subscribe(
  (s) => s.project,
  (project) => {
    if (!useStore.getState().settings?.autoSave) return;
    saveProject(project);
  },
);
