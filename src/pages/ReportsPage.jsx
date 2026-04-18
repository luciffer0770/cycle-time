import React, { useMemo, useState, useRef } from 'react';
import Panel from '../components/ui/Panel.jsx';
import { useStore } from '../store/useStore.js';
import { computeSchedule, efficiency, oee } from '../lib/engine.js';
import {
  bottleneckContributions,
  vaVsNva,
  taktGap,
  variability,
  suggestOptimization,
  diffSteps,
} from '../lib/analytics.js';
import { fmtPct, fmtSec, classNames } from '../lib/utils.js';
import { exportStepsToXlsx } from '../lib/excel.js';
import { exportReportPdf } from '../lib/pdf.js';
import {
  downloadProjectJson,
  readProjectJsonFile,
  downloadFullBackup,
  restoreFullBackup,
} from '../lib/project-io.js';
import {
  IconDownload,
  IconSave,
  IconRefresh,
  IconTrash,
  IconUpload,
  IconHistory,
} from '../components/ui/Icons.jsx';

export default function ReportsPage() {
  const project = useStore((s) => s.getActiveProject());
  const settings = useStore((s) => s.settings);
  const versions = useStore((s) => s.getVersions());
  const saveVersion = useStore((s) => s.saveVersion);
  const restoreVersion = useStore((s) => s.restoreVersion);
  const renameVersion = useStore((s) => s.renameVersion);
  const deleteVersion = useStore((s) => s.deleteVersion);
  const notify = useStore((s) => s.notify);
  const [label, setLabel] = useState('');
  const [diffAgainst, setDiffAgainst] = useState(null);
  const jsonRef = useRef(null);
  const backupRef = useRef(null);

  const schedule = useMemo(() => computeSchedule(project.steps), [project.steps]);
  const eff = efficiency(schedule);
  const tg = taktGap(schedule, project.taktTime);
  const va = vaVsNva(project.steps);
  const vari = variability(project.steps);
  const contrib = bottleneckContributions(schedule);
  const opt = suggestOptimization(project.steps);
  const o = oee(settings.oee);

  const diff = useMemo(() => {
    if (!diffAgainst) return null;
    const v = versions.find((x) => x.id === diffAgainst);
    if (!v) return null;
    return { version: v, ...diffSteps(v.snapshot.steps || [], project.steps) };
  }, [diffAgainst, versions, project.steps]);

  const handleJsonImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const p = await readProjectJsonFile(file);
      const st = useStore.getState();
      st.createProject('cnc-machining', p.name);
      st.patchActiveProject(() => ({ ...p }));
      notify(`Imported project “${p.name}”`, 'success');
    } catch (err) {
      notify('Failed: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  };
  const handleBackupRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await restoreFullBackup(file);
      notify('Backup restored. Reloading…', 'success');
      setTimeout(() => location.reload(), 500);
    } catch (err) {
      notify('Restore failed: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <Panel
          className="col-span-8"
          title="Report Preview"
          subtitle={`${project.name} · generated ${new Date().toLocaleString()}`}
          tone="cyan"
          right={
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="application/json"
                ref={jsonRef}
                onChange={handleJsonImport}
                className="hidden"
              />
              <input
                type="file"
                accept="application/json"
                ref={backupRef}
                onChange={handleBackupRestore}
                className="hidden"
              />
              <button className="btn-ghost" onClick={() => jsonRef.current?.click()}>
                <IconUpload className="w-3.5 h-3.5" /> Import JSON
              </button>
              <button className="btn-ghost" onClick={() => downloadProjectJson(project)}>
                <IconDownload className="w-3.5 h-3.5" /> JSON
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  exportStepsToXlsx(project);
                  notify('Exported Excel', 'success');
                }}
              >
                <IconDownload className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  exportReportPdf(project, settings);
                  notify('Exported PDF report', 'success');
                }}
              >
                <IconDownload className="w-3.5 h-3.5" /> PDF Report
              </button>
            </div>
          }
        >
          <div className="rounded-lg border border-white/10 bg-black/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-cyan">Engineering Report</div>
                <h3 className="text-xl font-semibold mt-1 text-gradient-cool">{project.name}</h3>
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  Takt: {project.taktTime}s · {project.steps.length} steps
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400 font-mono">
                ID: {project.id.slice(-8)}
                <br />
                {new Date().toLocaleDateString()}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <Kpi label="Total Cycle" value={fmtSec(schedule.totalCycleTime)} tone="cyan" />
              <Kpi
                label="Takt Gap"
                value={`${tg.gap.toFixed(1)}s`}
                tone={tg.meetsTakt ? 'green' : 'red'}
              />
              <Kpi label="Efficiency" value={fmtPct(eff * 100)} tone="green" />
              <Kpi label="OEE" value={fmtPct(o.oee * 100)} tone="violet" />
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                Critical Path Contribution
              </div>
              <div className="space-y-1.5">
                {contrib.slice(0, 8).map((c) => {
                  const names = c.stepIds
                    .map((sid) => schedule.steps.find((x) => x.id === sid)?.name)
                    .filter(Boolean)
                    .join(' + ');
                  return (
                    <div key={c.id} className="flex items-center gap-3 text-[12px]">
                      <div className="flex-1 truncate text-slate-200">{names}</div>
                      <div className="w-40 h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${c.pct}%`,
                            background: 'linear-gradient(90deg,#E11D2E,#6D28D9)',
                          }}
                        />
                      </div>
                      <div className="w-16 text-right font-mono text-critical">
                        {c.pct.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                Schedule
              </div>
              <div className="overflow-auto rounded-md border border-white/5 max-h-64">
                <table className="w-full text-[11px]">
                  <thead className="bg-black/40 text-slate-500 text-[10px] uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5">Step</th>
                      <th className="text-right px-2 py-1.5">M</th>
                      <th className="text-right px-2 py-1.5">O</th>
                      <th className="text-right px-2 py-1.5">Setup</th>
                      <th className="text-right px-2 py-1.5">CT</th>
                      <th className="text-right px-2 py-1.5">Start</th>
                      <th className="text-right px-2 py-1.5">End</th>
                      <th className="text-right px-2 py-1.5">Wait</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.steps.map((s) => (
                      <tr key={s.id} className="border-t border-white/5">
                        <td className="px-2 py-1 truncate text-slate-200">
                          {s.isCritical && <span className="text-critical mr-1">●</span>}
                          {s.name}
                        </td>
                        <td className="text-right px-2 py-1 font-mono">{s.machineTime}</td>
                        <td className="text-right px-2 py-1 font-mono">{s.operatorTime}</td>
                        <td className="text-right px-2 py-1 font-mono">{s.setupTime}</td>
                        <td className="text-right px-2 py-1 font-mono">
                          {s.cycleTime.toFixed(1)}
                        </td>
                        <td className="text-right px-2 py-1 font-mono">
                          {s.startTime.toFixed(1)}
                        </td>
                        <td className="text-right px-2 py-1 font-mono">{s.endTime.toFixed(1)}</td>
                        <td className="text-right px-2 py-1 font-mono text-warn">
                          {s.waitTime.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                AI Recommendations
              </div>
              <ul className="text-[12px] space-y-1 text-slate-200">
                {opt.length === 0 && (
                  <li className="text-slate-500">No leverage points detected.</li>
                )}
                {opt.slice(0, 4).map((o) => (
                  <li key={o.stepId} className="flex items-center gap-2">
                    <span className="text-optimal font-mono text-[10px]">
                      +{o.expectedGainSeconds.toFixed(1)}s
                    </span>
                    <span className="truncate">
                      <b>{o.stepName}</b> — reduce {o.reductionPct}% · {o.rationale}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[11px] font-mono">
              <Mini label="VA" value={fmtPct(va.vaPct)} tone="green" />
              <Mini label="NVA" value={fmtPct(va.nvaPct)} tone="red" />
              <Mini label="σ Step Time" value={`${vari.std.toFixed(2)}s`} tone="violet" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              className="btn-ghost text-xs"
              onClick={() => downloadFullBackup()}
              title="Download a complete backup of projects, versions, and settings"
            >
              <IconDownload className="w-3.5 h-3.5" /> Full Backup
            </button>
            <button
              className="btn-ghost text-xs"
              onClick={() => backupRef.current?.click()}
              title="Restore from a full backup JSON"
            >
              <IconUpload className="w-3.5 h-3.5" /> Restore Backup
            </button>
          </div>
        </Panel>

        <Panel className="col-span-4" title="Version Control" tone="violet"
          right={
            <span className="chip border border-violet/40 bg-violet/10 text-violet">
              <IconHistory className="w-3 h-3" /> {versions.length}
            </span>
          }
        >
          <div className="flex items-center gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Snapshot label…"
              className="input-industrial flex-1"
            />
            <button
              className="btn-primary"
              onClick={() => {
                const v = saveVersion(label || undefined);
                setLabel('');
                notify(`Saved version ${v.label}`, 'success');
              }}
            >
              <IconSave className="w-3.5 h-3.5" /> Save
            </button>
          </div>

          <div className="mt-3 max-h-[420px] overflow-auto space-y-2">
            {versions.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500">No versions yet.</div>
            )}
            {versions.map((v) => (
              <div
                key={v.id}
                className={classNames(
                  'rounded-md border p-2.5 transition',
                  diffAgainst === v.id
                    ? 'border-cyan/50 bg-cyan/10 shadow-neon-cyan'
                    : 'border-white/10 bg-black/30 hover:border-violet/40',
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <input
                    value={v.label}
                    onChange={(e) => renameVersion(v.id, e.target.value)}
                    className="bg-transparent outline-none text-sm text-slate-100 flex-1 focus:text-cyan truncate"
                  />
                  <button
                    className="h-7 w-7 grid place-items-center rounded text-slate-400 hover:text-cyan hover:bg-cyan/10"
                    title="Compare with current"
                    onClick={() => setDiffAgainst(diffAgainst === v.id ? null : v.id)}
                  >
                    <IconHistory className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="h-7 w-7 grid place-items-center rounded text-slate-400 hover:text-optimal hover:bg-optimal/10"
                    title="Restore"
                    onClick={() => {
                      restoreVersion(v.id);
                      notify(`Restored ${v.label}`, 'success');
                    }}
                  >
                    <IconRefresh className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="h-7 w-7 grid place-items-center rounded text-slate-400 hover:text-critical hover:bg-critical/10"
                    title="Delete"
                    onClick={() => deleteVersion(v.id)}
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  {new Date(v.createdAt).toLocaleString()} ·{' '}
                  {v.snapshot?.steps?.length || 0} steps · {v.snapshot?.taktTime || 0}s takt
                </div>
              </div>
            ))}
          </div>

          {diff && (
            <div className="mt-4 rounded-md border border-cyan/30 bg-cyan/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-cyan mb-2">
                Diff · Current vs “{diff.version.label}”
              </div>
              <div className="space-y-1.5 text-[12px] max-h-64 overflow-auto">
                {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 && (
                  <div className="text-slate-400 text-[11px]">No differences.</div>
                )}
                {diff.added.map((s) => (
                  <div key={s.id} className="text-optimal">
                    + {s.name}
                  </div>
                ))}
                {diff.removed.map((s) => (
                  <div key={s.id} className="text-critical">
                    − {s.name}
                  </div>
                ))}
                {diff.changed.map((c) => (
                  <div key={c.id} className="text-slate-200">
                    <div className="text-cyan">~ {c.name}</div>
                    <div className="pl-3 text-[10px] font-mono text-slate-400 space-y-0.5">
                      {c.fields.map((f, i) => (
                        <div key={i}>
                          {f.field}: <span className="text-critical">{fmtVal(f.from)}</span>
                          <span className="text-slate-500"> → </span>
                          <span className="text-optimal">{fmtVal(f.to)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function fmtVal(v) {
  if (v === null || v === undefined) return '—';
  if (Array.isArray(v)) return `[${v.length}]`;
  return String(v);
}

function Kpi({ label, value, tone }) {
  const tones = {
    cyan: 'text-cyan border-cyan/30',
    red: 'text-critical border-critical/30',
    green: 'text-optimal border-optimal/30',
    violet: 'text-violet border-violet/30',
  };
  return (
    <div className={`rounded-md border bg-black/40 p-3 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className="text-xl font-mono font-semibold mt-1">{value}</div>
    </div>
  );
}

function Mini({ label, value, tone }) {
  const tones = {
    cyan: 'text-cyan',
    red: 'text-critical',
    green: 'text-optimal',
    violet: 'text-violet',
  };
  return (
    <div className="rounded-md border border-white/10 bg-black/40 p-2">
      <div className="text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`${tones[tone]}`}>{value}</div>
    </div>
  );
}
