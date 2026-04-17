// Prebuilt process templates used by the Template Library & new-project flow.
import { uid } from './utils.js';

function s(name, machineTime, operatorTime, setupTime = 0, extras = {}) {
  return {
    id: uid('s'),
    name,
    machineTime,
    operatorTime,
    setupTime,
    transferTime: 0,
    waitTime: 0,
    startTime: 0,
    endTime: 0,
    cycleTime: machineTime + operatorTime + setupTime,
    groupId: null,
    dependencies: [],
    isValueAdded: true,
    stationId: null,
    variability: 0,
    ...extras,
  };
}

function chain(steps) {
  for (let i = 1; i < steps.length; i++) {
    steps[i].dependencies = [steps[i - 1].id];
  }
  return steps;
}

export const TEMPLATES = [
  {
    id: 'cnc-machining',
    name: 'CNC Machining Cell',
    description: 'Load → Machine → Inspect → Unload baseline.',
    taktTime: 120,
    build: () => {
      const list = [
        s('Load Raw Part', 0, 8, 0, { stationId: 'S1' }),
        s('CNC Turning', 35, 0, 5, { stationId: 'S2' }),
        s('CNC Milling', 42, 0, 4, { stationId: 'S3' }),
        s('Deburr', 0, 10, 0, { stationId: 'S3', isValueAdded: false }),
        s('Inspection', 0, 12, 0, { stationId: 'S4', isValueAdded: false }),
        s('Unload Finished', 0, 6, 0, { stationId: 'S4' }),
      ];
      return chain(list);
    },
  },
  {
    id: 'injection-molding',
    name: 'Injection Molding Line',
    description: 'Shot → Cool → Eject → Trim → QC.',
    taktTime: 60,
    build: () => {
      const list = [
        s('Material Feed', 0, 4, 0, { stationId: 'S1' }),
        s('Mold Clamp', 3, 0, 2, { stationId: 'S1' }),
        s('Injection Shot', 8, 0, 0, { stationId: 'S2' }),
        s('Cooling', 18, 0, 0, { stationId: 'S2', isValueAdded: false }),
        s('Eject Part', 2, 0, 0, { stationId: 'S3' }),
        s('Trim & Deflash', 0, 6, 0, { stationId: 'S3', isValueAdded: false }),
        s('QC Gate', 0, 5, 0, { stationId: 'S4', isValueAdded: false }),
      ];
      return chain(list);
    },
  },
  {
    id: 'electronics-assembly',
    name: 'Electronics Assembly',
    description: 'SMT + hand-insert + ICT with parallel operations.',
    taktTime: 45,
    build: () => {
      const solder = s('Solder Paste', 4, 0, 0, { stationId: 'S1' });
      const place = s('SMT Pick & Place', 12, 0, 2, { stationId: 'S2', dependencies: [solder.id] });
      const reflow = s('Reflow Oven', 20, 0, 0, {
        stationId: 'S3',
        dependencies: [place.id],
        isValueAdded: true,
      });
      const handA = s('Hand Insert Connector A', 0, 10, 0, {
        stationId: 'S4',
        dependencies: [reflow.id],
        groupId: 'hand-insert',
      });
      const handB = s('Hand Insert Connector B', 0, 9, 0, {
        stationId: 'S4',
        dependencies: [reflow.id],
        groupId: 'hand-insert',
      });
      const ict = s('In-Circuit Test', 0, 8, 0, {
        stationId: 'S5',
        dependencies: [handA.id, handB.id],
        isValueAdded: false,
      });
      const pack = s('Packaging', 0, 6, 0, { stationId: 'S5', dependencies: [ict.id] });
      return [solder, place, reflow, handA, handB, ict, pack];
    },
  },
  {
    id: 'automotive-weld',
    name: 'Automotive Weld Station',
    description: 'Parallel weld robots feeding a single inspection gate.',
    taktTime: 75,
    build: () => {
      const load = s('Load Body Frame', 0, 10, 0, { stationId: 'S1' });
      const r1 = s('Robot Weld A', 22, 0, 0, {
        stationId: 'S2',
        dependencies: [load.id],
        groupId: 'weld',
      });
      const r2 = s('Robot Weld B', 26, 0, 0, {
        stationId: 'S2',
        dependencies: [load.id],
        groupId: 'weld',
      });
      const r3 = s('Robot Weld C', 19, 0, 0, {
        stationId: 'S2',
        dependencies: [load.id],
        groupId: 'weld',
      });
      const cool = s('Cooling', 8, 0, 0, {
        stationId: 'S3',
        dependencies: [r1.id, r2.id, r3.id],
        isValueAdded: false,
      });
      const inspect = s('Seam Inspection', 0, 12, 0, {
        stationId: 'S4',
        dependencies: [cool.id],
        isValueAdded: false,
      });
      const unload = s('Transfer to Paint', 0, 8, 0, {
        stationId: 'S4',
        dependencies: [inspect.id],
        transferTime: 8,
        isValueAdded: false,
      });
      return [load, r1, r2, r3, cool, inspect, unload];
    },
  },
  {
    id: 'packaging-line',
    name: 'Packaging Line',
    description: 'Fill → Seal → Label → Palletize.',
    taktTime: 15,
    build: () => {
      const list = [
        s('Fill', 4, 0, 0, { stationId: 'S1' }),
        s('Seal', 3, 0, 0, { stationId: 'S2' }),
        s('Label', 2, 0, 0, { stationId: 'S3' }),
        s('Inspect Label', 0, 2, 0, { stationId: 'S3', isValueAdded: false }),
        s('Case Pack', 0, 6, 0, { stationId: 'S4' }),
        s('Palletize', 0, 5, 0, { stationId: 'S5' }),
      ];
      return chain(list);
    },
  },
];

export function makeTemplateSteps(templateId) {
  const t = TEMPLATES.find((x) => x.id === templateId);
  if (!t) return { steps: [], taktTime: 60 };
  return { steps: t.build(), taktTime: t.taktTime };
}
