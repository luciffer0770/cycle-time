// -----------------------------------------------------------------------------
// Cycle Time Analyzer — Advanced Analytics Engine
// -----------------------------------------------------------------------------

import { computeCycleTime, computeSchedule, valueAddedTime } from './engine.js';

export function bottleneckContributions(schedule) {
  const total = schedule.totalCycleTime || 0;
  if (!total) return [];
  return schedule.units
    .filter((u) => u.isCritical)
    .map((u) => ({
      id: u.id,
      kind: u.kind,
      stepIds: u.stepIds,
      duration: u.duration,
      pct: (u.duration / total) * 100,
    }))
    .sort((a, b) => b.pct - a.pct);
}

// Pareto: ranks ALL steps by cycle time and shows cumulative %.
export function pareto(steps) {
  const arr = [...steps]
    .map((s) => ({ id: s.id, name: s.name, value: computeCycleTime(s) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = arr.reduce((a, b) => a + b.value, 0);
  let cum = 0;
  return arr.map((x) => {
    cum += x.value;
    return {
      ...x,
      pct: total ? (x.value / total) * 100 : 0,
      cumulativePct: total ? (cum / total) * 100 : 0,
    };
  });
}

export function vaVsNva(steps) {
  let va = 0;
  let nva = 0;
  (steps || []).forEach((s) => {
    const t = computeCycleTime(s);
    if (s.isValueAdded) va += t;
    else nva += t;
  });
  const total = va + nva;
  return {
    va,
    nva,
    total,
    vaPct: total ? (va / total) * 100 : 0,
    nvaPct: total ? (nva / total) * 100 : 0,
  };
}

export function taktGap(schedule, taktTime) {
  const t = Number(taktTime) || 0;
  const total = schedule.totalCycleTime || 0;
  return {
    taktTime: t,
    totalCycleTime: total,
    gap: t - total,
    meetsTakt: t > 0 ? total <= t : false,
    utilization: t > 0 ? total / t : 0,
  };
}

// Throughput at a given takt time / total cycle (whichever binds).
export function throughput(schedule, taktTime, hoursPerDay = 8, shiftsPerDay = 1) {
  const binding = Math.max(schedule.totalCycleTime || 0, Number(taktTime) || 0);
  if (!binding) return { perHour: 0, perShift: 0, perDay: 0, bindingSeconds: 0 };
  const perHour = 3600 / binding;
  const perShift = perHour * hoursPerDay;
  const perDay = perShift * shiftsPerDay;
  return {
    perHour,
    perShift,
    perDay,
    bindingSeconds: binding,
  };
}

export function stepImpact(steps, stepId, delta = 1) {
  const patched = steps.map((s) =>
    s.id === stepId
      ? { ...s, machineTime: Math.max(0, Number(s.machineTime || 0) - delta) }
      : s,
  );
  const before = computeSchedule(steps);
  const after = computeSchedule(patched);
  return {
    before: before.totalCycleTime,
    after: after.totalCycleTime,
    savedSeconds: before.totalCycleTime - after.totalCycleTime,
  };
}

export function allStepImpacts(steps) {
  const baseline = computeSchedule(steps).totalCycleTime;
  return steps
    .map((s) => {
      const patched = steps.map((x) =>
        x.id === s.id
          ? { ...x, machineTime: Math.max(0, Number(x.machineTime || 0) - 1) }
          : x,
      );
      const after = computeSchedule(patched).totalCycleTime;
      return {
        id: s.id,
        name: s.name,
        savedPerSecond: Math.max(0, baseline - after),
      };
    })
    .sort((a, b) => b.savedPerSecond - a.savedPerSecond);
}

// Load per station (for Yamazumi + balancing)
export function lineBalancing(schedule) {
  const stations = new Map();
  schedule.steps.forEach((s) => {
    const key = s.stationId || 'unassigned';
    if (!stations.has(key))
      stations.set(key, {
        stationId: key,
        load: 0,
        steps: [],
        va: 0,
        nva: 0,
      });
    const st = stations.get(key);
    st.load += s.cycleTime;
    if (s.isValueAdded) st.va += s.cycleTime;
    else st.nva += s.cycleTime;
    st.steps.push(s);
  });
  const loads = Array.from(stations.values()).sort((a, b) =>
    String(a.stationId).localeCompare(String(b.stationId)),
  );
  const maxLoad = loads.reduce((m, x) => Math.max(m, x.load), 0);
  const sumLoad = loads.reduce((m, x) => m + x.load, 0);
  const avgLoad = loads.length ? sumLoad / loads.length : 0;
  const balance = maxLoad > 0 ? avgLoad / maxLoad : 1;
  return { stations: loads, maxLoad, avgLoad, balance };
}

// Yamazumi chart data: one row per station, segments per step with cumulative
// time from bottom. Color by VA/NVA and highlight machine vs operator.
export function yamazumi(schedule) {
  const bal = lineBalancing(schedule);
  return bal.stations.map((st) => {
    let acc = 0;
    return {
      stationId: st.stationId,
      total: st.load,
      segments: st.steps.map((s) => {
        const seg = {
          stepId: s.id,
          name: s.name,
          start: acc,
          duration: s.cycleTime,
          end: acc + s.cycleTime,
          isValueAdded: s.isValueAdded,
          isCritical: s.isCritical,
        };
        acc += s.cycleTime;
        return seg;
      }),
    };
  });
}

// Greedy LPT auto balancer
export function autoBalance(steps, stationCount = 4) {
  const N = Math.max(1, stationCount | 0);
  const stations = Array.from({ length: N }, (_, i) => ({
    stationId: `S${i + 1}`,
    load: 0,
    steps: [],
  }));
  const sorted = [...steps].sort((a, b) => computeCycleTime(b) - computeCycleTime(a));
  sorted.forEach((s) => {
    stations.sort((a, b) => a.load - b.load);
    stations[0].load += computeCycleTime(s);
    stations[0].steps.push(s.id);
  });
  stations.sort((a, b) => a.stationId.localeCompare(b.stationId));
  const assignments = new Map();
  stations.forEach((st) => st.steps.forEach((id) => assignments.set(id, st.stationId)));
  const patched = steps.map((s) => ({
    ...s,
    stationId: assignments.get(s.id) || s.stationId,
  }));
  return { stations, patched };
}

export function variability(steps) {
  const values = steps.map((s) => computeCycleTime(s));
  if (!values.length) return { min: 0, max: 0, avg: 0, std: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length);
  return { min, max, avg, std };
}

export function distribution(steps, buckets = 8) {
  const values = steps.map((s) => computeCycleTime(s));
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1e-6, max - min);
  const w = span / buckets;
  const out = Array.from({ length: buckets }, (_, i) => ({
    range: `${(min + i * w).toFixed(0)}–${(min + (i + 1) * w).toFixed(0)}s`,
    count: 0,
  }));
  values.forEach((v) => {
    let idx = Math.floor((v - min) / w);
    if (idx >= buckets) idx = buckets - 1;
    if (idx < 0) idx = 0;
    out[idx].count += 1;
  });
  return out;
}

// -----------------------------------------------------------------------------
// MUDA (7 wastes) classification tally
// -----------------------------------------------------------------------------
export const MUDA_TYPES = [
  { id: 'waiting', label: 'Waiting' },
  { id: 'transport', label: 'Transport' },
  { id: 'motion', label: 'Motion' },
  { id: 'over-processing', label: 'Over-processing' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'over-production', label: 'Over-production' },
  { id: 'defects', label: 'Defects' },
];

export function mudaSummary(steps) {
  const map = new Map(MUDA_TYPES.map((m) => [m.id, { ...m, seconds: 0, count: 0 }]));
  steps.forEach((s) => {
    if (!s.isValueAdded && s.mudaType && map.has(s.mudaType)) {
      const m = map.get(s.mudaType);
      m.seconds += computeCycleTime(s);
      m.count += 1;
    }
  });
  return Array.from(map.values());
}

// -----------------------------------------------------------------------------
// Smart suggestions & AI-style optimization
// -----------------------------------------------------------------------------

export function suggestNextSteps(step) {
  const suggestions = [];
  const mt = Number(step?.machineTime || 0);
  const ot = Number(step?.operatorTime || 0);
  if (mt >= 20) {
    suggestions.push({
      id: 'cooling',
      name: 'Cooling / Dwell',
      reason: 'High machine time — add a cooling dwell to stabilize cycle.',
      template: { machineTime: 4, operatorTime: 0, setupTime: 0, isValueAdded: false, mudaType: 'waiting' },
    });
  }
  if (ot >= 15) {
    suggestions.push({
      id: 'automation',
      name: 'Automation Pick & Place',
      reason: 'High operator time — consider automated handling.',
      template: { machineTime: 6, operatorTime: 0, setupTime: 0, isValueAdded: true },
    });
  }
  suggestions.push({
    id: 'inspection',
    name: 'Inspection',
    reason: 'Quality gate after critical operation.',
    template: { machineTime: 0, operatorTime: 5, setupTime: 0, isValueAdded: false, mudaType: 'over-processing' },
  });
  suggestions.push({
    id: 'transfer',
    name: 'Transfer',
    reason: 'Move part to next station.',
    template: { machineTime: 0, operatorTime: 3, setupTime: 0, transferTime: 3, isValueAdded: false, mudaType: 'transport' },
  });
  suggestions.push({
    id: 'quality',
    name: 'Quality Check (SPC)',
    reason: 'Statistical process control checkpoint.',
    template: { machineTime: 0, operatorTime: 4, setupTime: 0, isValueAdded: false, mudaType: 'defects' },
  });
  return suggestions;
}

export function suggestOptimization(steps) {
  if (!steps || !steps.length) return [];
  const schedule = computeSchedule(steps);
  const impacts = allStepImpacts(steps);
  const byId = new Map(steps.map((s) => [s.id, s]));
  return impacts
    .filter((i) => i.savedPerSecond > 0)
    .slice(0, 5)
    .map((i) => {
      const s = byId.get(i.id);
      const total = schedule.totalCycleTime || 1;
      const candidateReduction = Math.max(1, Math.round(Number(s.machineTime || 0) * 0.2));
      const projectedGain = i.savedPerSecond * candidateReduction;
      return {
        stepId: i.id,
        stepName: s.name,
        reductionPct: 20,
        reductionSeconds: candidateReduction,
        expectedGainSeconds: projectedGain,
        expectedGainPct: (projectedGain / total) * 100,
        rationale:
          Number(s.machineTime || 0) >= Number(s.operatorTime || 0)
            ? 'Reduce machine time (tooling upgrade / parameter tuning).'
            : 'Reduce operator time (ergonomics / automation).',
      };
    });
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------
export function validateSteps(steps) {
  const issues = [];
  const byId = new Map(steps.map((s) => [s.id, s]));
  steps.forEach((s) => {
    if (!s.name || !String(s.name).trim()) {
      issues.push({ level: 'error', stepId: s.id, message: 'Step has no name.' });
    }
    ['machineTime', 'operatorTime', 'setupTime'].forEach((f) => {
      const v = Number(s[f]);
      if (!Number.isFinite(v) || v < 0) {
        issues.push({
          level: 'error',
          stepId: s.id,
          message: `${f} must be zero or positive on “${s.name || s.id}”.`,
        });
      }
      if (v > 3600) {
        issues.push({
          level: 'warning',
          stepId: s.id,
          message: `${f} of ${v}s looks unrealistic on “${s.name || s.id}”.`,
        });
      }
    });
    if (computeCycleTime(s) === 0) {
      issues.push({
        level: 'warning',
        stepId: s.id,
        message: `“${s.name || s.id}” has zero cycle time.`,
      });
    }
    (s.dependencies || []).forEach((d) => {
      if (!byId.has(d))
        issues.push({
          level: 'warning',
          stepId: s.id,
          message: `Dependency “${d}” not found on “${s.name || s.id}”.`,
        });
      if (d === s.id)
        issues.push({
          level: 'error',
          stepId: s.id,
          message: `Self-dependency on “${s.name || s.id}”.`,
        });
    });
  });

  const schedule = computeSchedule(steps);
  if (schedule.cycleDetected) {
    issues.push({
      level: 'error',
      stepId: null,
      message: `Circular dependency detected across ${schedule.cycleNodes.length} node(s).`,
    });
  }
  return issues;
}

export function simulateRemoveStep(steps, stepId) {
  const remaining = steps
    .filter((s) => s.id !== stepId)
    .map((s) => ({
      ...s,
      dependencies: (s.dependencies || []).filter((d) => d !== stepId),
    }));
  const before = computeSchedule(steps);
  const after = computeSchedule(remaining);
  return { before, after, delta: before.totalCycleTime - after.totalCycleTime, remaining };
}

// Diff between two step sets (used in version compare)
export function diffSteps(a, b) {
  const byIdA = new Map((a || []).map((s) => [s.id, s]));
  const byIdB = new Map((b || []).map((s) => [s.id, s]));
  const added = [];
  const removed = [];
  const changed = [];
  byIdB.forEach((s, id) => {
    if (!byIdA.has(id)) added.push(s);
    else {
      const o = byIdA.get(id);
      const fields = [];
      ['name', 'machineTime', 'operatorTime', 'setupTime', 'groupId', 'stationId', 'isValueAdded'].forEach(
        (f) => {
          if (o[f] !== s[f]) fields.push({ field: f, from: o[f], to: s[f] });
        },
      );
      const depsA = (o.dependencies || []).slice().sort().join(',');
      const depsB = (s.dependencies || []).slice().sort().join(',');
      if (depsA !== depsB)
        fields.push({ field: 'dependencies', from: o.dependencies, to: s.dependencies });
      if (fields.length) changed.push({ id, name: s.name, fields });
    }
  });
  byIdA.forEach((s, id) => {
    if (!byIdB.has(id)) removed.push(s);
  });
  return { added, removed, changed };
}

export { computeCycleTime, computeSchedule, valueAddedTime };
