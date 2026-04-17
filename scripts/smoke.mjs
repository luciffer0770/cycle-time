// Quick sanity test on the core engine & analytics — run with: node scripts/smoke.mjs
import { computeSchedule } from '../src/lib/engine.js';
import {
  bottleneckContributions,
  vaVsNva,
  taktGap,
  allStepImpacts,
  suggestOptimization,
  autoBalance,
  validateSteps,
  simulateRemoveStep,
} from '../src/lib/analytics.js';

const steps = [
  { id: 'a', name: 'Load', machineTime: 0, operatorTime: 8, setupTime: 0, dependencies: [], isValueAdded: true, stationId: 'S1' },
  { id: 'b', name: 'Mill', machineTime: 40, operatorTime: 0, setupTime: 5, dependencies: ['a'], isValueAdded: true, stationId: 'S2' },
  { id: 'c', name: 'Turn', machineTime: 35, operatorTime: 0, setupTime: 5, dependencies: ['a'], isValueAdded: true, stationId: 'S2', groupId: null },
  { id: 'd', name: 'Inspect', machineTime: 0, operatorTime: 12, setupTime: 0, dependencies: ['b','c'], isValueAdded: false, stationId: 'S3' },
];

const sched = computeSchedule(steps);
console.log('total =', sched.totalCycleTime);
console.log('bottleneck =', sched.bottleneck?.stepNames);
console.log('critical =', sched.criticalPath);
console.log('bn contrib =', bottleneckContributions(sched));
console.log('va/nva =', vaVsNva(steps));
console.log('takt gap =', taktGap(sched, 80));
console.log('impacts =', allStepImpacts(steps).slice(0, 3));
console.log('optim =', suggestOptimization(steps));
console.log('balance =', autoBalance(steps, 3).stations.map(s => ({s:s.stationId, load:s.load})));
console.log('validate =', validateSteps(steps));
console.log('remove b delta =', simulateRemoveStep(steps, 'b').delta);

// Parallel group test
const parallel = [
  { id: 'p', name: 'Prep', machineTime: 5, operatorTime: 0, setupTime: 0, dependencies: [], isValueAdded: true },
  { id: 'p1', name: 'Weld A', machineTime: 20, operatorTime: 0, setupTime: 0, dependencies: ['p'], groupId: 'weld', isValueAdded: true },
  { id: 'p2', name: 'Weld B', machineTime: 26, operatorTime: 0, setupTime: 0, dependencies: ['p'], groupId: 'weld', isValueAdded: true },
  { id: 'p3', name: 'Weld C', machineTime: 18, operatorTime: 0, setupTime: 0, dependencies: ['p'], groupId: 'weld', isValueAdded: true },
  { id: 'end', name: 'Cool', machineTime: 5, operatorTime: 0, setupTime: 0, dependencies: ['p1','p2','p3'], isValueAdded: false },
];
const ps = computeSchedule(parallel);
console.log('\nPARALLEL TEST');
console.log('total =', ps.totalCycleTime, '(expected 5+26+5=36)');
console.log('bottleneck =', ps.bottleneck?.stepNames);
