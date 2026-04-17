// -----------------------------------------------------------------------------
// Cycle Time Analyzer — Core Calculation Engine
//
// Responsibilities:
//   - cycleTime = machineTime + operatorTime + setupTime
//   - Parallel execution by shared groupId (group duration = MAX cycleTime)
//   - Dependency resolution over a DAG
//   - Critical path (longest path) = TOTAL cycle time
//   - Wait time, bottleneck detection, efficiency, line balancing
// -----------------------------------------------------------------------------

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function computeCycleTime(step) {
  return num(step.machineTime) + num(step.operatorTime) + num(step.setupTime);
}

// Returns the *effective unit* for a step: either the step itself, or — if it
// belongs to a parallel group — a synthetic group unit whose duration is the
// MAX cycleTime of its members. Dependencies of a group are the union of its
// members' dependencies (excluding members of the group itself).
function buildUnits(steps) {
  const byId = new Map();
  steps.forEach((s) => byId.set(s.id, s));

  const groups = new Map(); // groupId -> members[]
  const standalone = [];

  steps.forEach((s) => {
    if (s.groupId) {
      if (!groups.has(s.groupId)) groups.set(s.groupId, []);
      groups.get(s.groupId).push(s);
    } else {
      standalone.push(s);
    }
  });

  const units = [];

  standalone.forEach((s) => {
    units.push({
      kind: 'step',
      id: s.id,
      stepIds: [s.id],
      duration: computeCycleTime(s),
      dependencies: (s.dependencies || []).filter((d) => byId.has(d)),
      ref: s,
    });
  });

  groups.forEach((members, groupId) => {
    const memberIds = new Set(members.map((m) => m.id));
    const deps = new Set();
    members.forEach((m) => {
      (m.dependencies || []).forEach((d) => {
        if (!memberIds.has(d) && byId.has(d)) deps.add(d);
      });
    });
    const duration = Math.max(0, ...members.map(computeCycleTime));
    units.push({
      kind: 'group',
      id: `group:${groupId}`,
      groupId,
      stepIds: members.map((m) => m.id),
      members,
      duration,
      dependencies: Array.from(deps),
      ref: null,
    });
  });

  return { units, byId, groups, standalone };
}

// Map a stepId -> unitId so dependency pointers can be normalized.
function buildStepToUnit(units) {
  const map = new Map();
  units.forEach((u) => {
    u.stepIds.forEach((sid) => map.set(sid, u.id));
  });
  return map;
}

// Topological order + cycle detection on the unit-level DAG.
function topoSort(units) {
  const stepToUnit = buildStepToUnit(units);
  const nodes = new Map();
  units.forEach((u) => {
    const depUnits = new Set(
      (u.dependencies || [])
        .map((sid) => stepToUnit.get(sid))
        .filter((id) => id && id !== u.id),
    );
    nodes.set(u.id, { unit: u, deps: Array.from(depUnits), out: [] });
  });
  nodes.forEach((node) => {
    node.deps.forEach((d) => {
      if (nodes.has(d)) nodes.get(d).out.push(node.unit.id);
    });
  });

  const indeg = new Map();
  nodes.forEach((n, id) => indeg.set(id, n.deps.length));
  const queue = [];
  indeg.forEach((v, k) => {
    if (v === 0) queue.push(k);
  });
  const ordered = [];
  const cycleNodes = new Set();
  while (queue.length) {
    const id = queue.shift();
    ordered.push(id);
    nodes.get(id).out.forEach((o) => {
      indeg.set(o, indeg.get(o) - 1);
      if (indeg.get(o) === 0) queue.push(o);
    });
  }
  if (ordered.length !== nodes.size) {
    // Remaining are in cycles.
    indeg.forEach((v, k) => {
      if (v > 0) cycleNodes.add(k);
    });
    // Append remaining to proceed gracefully.
    indeg.forEach((_, k) => {
      if (!ordered.includes(k)) ordered.push(k);
    });
  }
  return { nodes, order: ordered, cycleNodes, stepToUnit };
}

export function computeSchedule(rawSteps) {
  const steps = (rawSteps || []).map((s) => ({
    ...s,
    dependencies: Array.isArray(s.dependencies) ? s.dependencies : [],
  }));

  if (!steps.length) {
    return emptyResult();
  }

  const { units, byId, groups } = buildUnits(steps);
  const { nodes, order, cycleNodes, stepToUnit } = topoSort(units);

  const unitStart = new Map();
  const unitEnd = new Map();
  const unitCritPred = new Map(); // which predecessor drives start time

  order.forEach((id) => {
    const { unit, deps } = nodes.get(id);
    let start = 0;
    let driver = null;
    deps.forEach((d) => {
      const end = unitEnd.get(d) ?? 0;
      if (end > start) {
        start = end;
        driver = d;
      }
    });
    unitStart.set(id, start);
    unitEnd.set(id, start + unit.duration);
    if (driver) unitCritPred.set(id, driver);
  });

  // Total cycle time = max end across all units (longest path).
  let totalCycleTime = 0;
  let endUnit = null;
  unitEnd.forEach((v, k) => {
    if (v > totalCycleTime) {
      totalCycleTime = v;
      endUnit = k;
    }
  });

  // Critical path via backtracking from the longest-end unit.
  const critical = new Set();
  let cur = endUnit;
  while (cur) {
    critical.add(cur);
    cur = unitCritPred.get(cur) || null;
  }

  // Materialize per-step schedule.
  const scheduled = steps.map((s) => {
    const unitId = stepToUnit.get(s.id);
    const startTime = unitStart.get(unitId) ?? 0;
    const cycleTime = computeCycleTime(s);
    const endTime = startTime + cycleTime;

    // wait = startTime - max(end of direct step-level dependencies)
    let depMaxEnd = 0;
    (s.dependencies || []).forEach((d) => {
      const du = stepToUnit.get(d);
      const dend = unitEnd.get(du);
      if (dend && dend > depMaxEnd) depMaxEnd = dend;
    });
    const waitTime = Math.max(0, startTime - depMaxEnd);

    return {
      ...s,
      cycleTime,
      startTime,
      endTime,
      waitTime,
      isCritical: critical.has(unitId),
    };
  });

  // Bottleneck: step/group with max contribution to critical path
  const bottleneck = pickBottleneck(units, critical, scheduled);

  return {
    steps: scheduled,
    totalCycleTime,
    units: units.map((u) => ({
      id: u.id,
      kind: u.kind,
      groupId: u.groupId,
      stepIds: u.stepIds,
      duration: u.duration,
      start: unitStart.get(u.id) ?? 0,
      end: unitEnd.get(u.id) ?? 0,
      isCritical: critical.has(u.id),
      dependencies: u.dependencies,
    })),
    criticalPath: Array.from(critical),
    bottleneck,
    cycleDetected: cycleNodes.size > 0,
    cycleNodes: Array.from(cycleNodes),
    groupMap: Object.fromEntries(
      Array.from(groups.entries()).map(([k, v]) => [k, v.map((m) => m.id)]),
    ),
  };
}

function pickBottleneck(units, critical, scheduled) {
  const byId = new Map(scheduled.map((s) => [s.id, s]));
  let best = null;
  units.forEach((u) => {
    if (!critical.has(u.id)) return;
    const entry = {
      kind: u.kind,
      id: u.id,
      groupId: u.groupId || null,
      duration: u.duration,
      stepIds: u.stepIds,
      stepNames: u.stepIds.map((sid) => byId.get(sid)?.name).filter(Boolean),
    };
    if (!best || entry.duration > best.duration) best = entry;
  });
  return best;
}

function emptyResult() {
  return {
    steps: [],
    totalCycleTime: 0,
    units: [],
    criticalPath: [],
    bottleneck: null,
    cycleDetected: false,
    cycleNodes: [],
    groupMap: {},
  };
}

// -----------------------------------------------------------------------------
// Higher-level metrics
// -----------------------------------------------------------------------------

export function valueAddedTime(steps) {
  return (steps || [])
    .filter((s) => s.isValueAdded)
    .reduce((acc, s) => acc + computeCycleTime(s), 0);
}

export function efficiency(schedule) {
  if (!schedule || !schedule.totalCycleTime) return 0;
  const va = valueAddedTime(schedule.steps);
  return va / schedule.totalCycleTime;
}

// OEE: availability * performance * quality
export function oee({ availability = 0.9, performance = 0.95, quality = 0.99 } = {}) {
  const A = clamp01(availability);
  const P = clamp01(performance);
  const Q = clamp01(quality);
  return { availability: A, performance: P, quality: Q, oee: A * P * Q };
}

export function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// Utility: detect circular dependencies (returns array of step IDs in cycles).
export function detectCycles(steps) {
  const g = new Map();
  steps.forEach((s) => g.set(s.id, (s.dependencies || []).filter((d) => d !== s.id)));
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map();
  steps.forEach((s) => color.set(s.id, WHITE));
  const inCycle = new Set();

  const visit = (id, stack) => {
    color.set(id, GRAY);
    stack.push(id);
    (g.get(id) || []).forEach((n) => {
      if (!g.has(n)) return;
      if (color.get(n) === GRAY) {
        const idx = stack.indexOf(n);
        if (idx >= 0) stack.slice(idx).forEach((x) => inCycle.add(x));
      } else if (color.get(n) === WHITE) visit(n, stack);
    });
    stack.pop();
    color.set(id, BLACK);
  };

  steps.forEach((s) => {
    if (color.get(s.id) === WHITE) visit(s.id, []);
  });
  return Array.from(inCycle);
}
