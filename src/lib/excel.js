import * as XLSX from 'xlsx';
import { uid } from './utils.js';
import { computeSchedule } from './engine.js';

// Flexible column resolver: accepts a number of common header names.
const COL_MAP = {
  name: ['step name', 'name', 'step', 'operation', 'activity', 'task'],
  machineTime: ['machine time', 'machine', 'machine_time', 'm/c time', 'mc_time'],
  operatorTime: ['operator time', 'operator', 'operator_time', 'manual time', 'manual'],
  setupTime: ['setup', 'setup time', 'changeover'],
  transferTime: ['transfer', 'transfer time'],
  dependencies: ['dependencies', 'depends on', 'predecessors', 'dependency'],
  groupId: ['group', 'group id', 'parallel group', 'parallel'],
  stationId: ['station', 'station id', 'workstation'],
  isValueAdded: ['value added', 'va', 'is_value_added', 'value-added'],
};

function pick(obj, keys) {
  const lower = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [String(k).toLowerCase().trim(), v]),
  );
  for (const k of keys) {
    if (lower[k] !== undefined && lower[k] !== null && String(lower[k]).trim() !== '')
      return lower[k];
  }
  return undefined;
}

function parseDeps(value) {
  if (!value) return [];
  return String(value)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function truthy(v) {
  if (v === undefined || v === null || v === '') return false;
  const s = String(v).toLowerCase().trim();
  return ['1', 'true', 'y', 'yes', 'va', 'value added', 'value-added'].includes(s);
}

export async function importStepsFromFile(file) {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // First pass: resolve names -> temporary id so deps can reference by name.
  const tempSteps = rows.map((row) => {
    const name = pick(row, COL_MAP.name) || 'Unnamed Step';
    return {
      id: uid('s'),
      name: String(name).trim(),
      machineTime: Number(pick(row, COL_MAP.machineTime)) || 0,
      operatorTime: Number(pick(row, COL_MAP.operatorTime)) || 0,
      setupTime: Number(pick(row, COL_MAP.setupTime)) || 0,
      transferTime: Number(pick(row, COL_MAP.transferTime)) || 0,
      _rawDeps: parseDeps(pick(row, COL_MAP.dependencies)),
      groupId: pick(row, COL_MAP.groupId) ? String(pick(row, COL_MAP.groupId)).trim() : null,
      stationId: pick(row, COL_MAP.stationId) ? String(pick(row, COL_MAP.stationId)).trim() : null,
      isValueAdded: pick(row, COL_MAP.isValueAdded) === undefined
        ? true
        : truthy(pick(row, COL_MAP.isValueAdded)),
      dependencies: [],
      waitTime: 0,
      startTime: 0,
      endTime: 0,
      cycleTime: 0,
      variability: 0,
    };
  });

  const byName = new Map();
  tempSteps.forEach((s) => byName.set(s.name.toLowerCase(), s.id));

  tempSteps.forEach((s) => {
    s.dependencies = s._rawDeps
      .map((d) => {
        const match = byName.get(String(d).toLowerCase());
        return match || null;
      })
      .filter(Boolean);
    delete s._rawDeps;
  });

  return tempSteps;
}

export function exportStepsToXlsx(project) {
  const schedule = computeSchedule(project.steps);
  const rows = schedule.steps.map((s) => ({
    'Step ID': s.id,
    'Step Name': s.name,
    Station: s.stationId || '',
    Group: s.groupId || '',
    'Machine Time (s)': s.machineTime,
    'Operator Time (s)': s.operatorTime,
    'Setup (s)': s.setupTime,
    'Transfer (s)': s.transferTime || 0,
    'Cycle Time (s)': s.cycleTime,
    'Start (s)': Number(s.startTime.toFixed(2)),
    'End (s)': Number(s.endTime.toFixed(2)),
    'Wait (s)': Number(s.waitTime.toFixed(2)),
    'Value Added': s.isValueAdded ? 'Yes' : 'No',
    Dependencies: (s.dependencies || [])
      .map((d) => schedule.steps.find((x) => x.id === d)?.name)
      .filter(Boolean)
      .join('; '),
    Critical: s.isCritical ? 'Yes' : 'No',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Steps');

  const summary = [
    { Metric: 'Project', Value: project.name },
    { Metric: 'Takt Time (s)', Value: project.taktTime },
    { Metric: 'Total Cycle Time (s)', Value: Number(schedule.totalCycleTime.toFixed(2)) },
    { Metric: 'Critical Path Units', Value: schedule.criticalPath.length },
    { Metric: 'Bottleneck', Value: schedule.bottleneck?.stepNames?.join(' + ') || '—' },
  ];
  const sws = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, sws, 'Summary');

  XLSX.writeFile(wb, `${(project.name || 'cycle-time').replace(/\s+/g, '_')}.xlsx`);
}

export function exportTemplateXlsx() {
  const rows = [
    {
      'Step Name': 'Load',
      'Machine Time': 0,
      'Operator Time': 8,
      Setup: 0,
      Dependencies: '',
      Group: '',
      Station: 'S1',
      'Value Added': 'Yes',
    },
    {
      'Step Name': 'CNC Turning',
      'Machine Time': 35,
      'Operator Time': 0,
      Setup: 5,
      Dependencies: 'Load',
      Group: '',
      Station: 'S2',
      'Value Added': 'Yes',
    },
    {
      'Step Name': 'Inspection',
      'Machine Time': 0,
      'Operator Time': 10,
      Setup: 0,
      Dependencies: 'CNC Turning',
      Group: '',
      Station: 'S3',
      'Value Added': 'No',
    },
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'cycle_time_template.xlsx');
}
