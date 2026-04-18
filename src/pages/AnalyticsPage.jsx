import React, { useMemo, useState } from 'react';
import Panel from '../components/ui/Panel.jsx';
import YamazumiChart from '../components/charts/YamazumiChart.jsx';
import ParetoChart from '../components/charts/ParetoChart.jsx';
import { useStore } from '../store/useStore.js';
import { computeSchedule } from '../lib/engine.js';
import {
  bottleneckContributions,
  distribution,
  lineBalancing,
  yamazumi,
  autoBalance,
  variability,
  allStepImpacts,
  suggestOptimization,
  vaVsNva,
  taktGap,
  throughput,
  pareto,
  mudaSummary,
  MUDA_TYPES,
} from '../lib/analytics.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { fmtPct, fmtSec } from '../lib/utils.js';
import { IconSparkles, IconRefresh, IconSave } from '../components/ui/Icons.jsx';

export default function AnalyticsPage() {
  const project = useStore((s) => s.getActiveProject());
  const settings = useStore((s) => s.settings);
  const setSteps = useStore((s) => s.setSteps);
  const saveAsLine = useStore((s) => s.saveAsLine);
  const removeLine = useStore((s) => s.removeLine);
  const notify = useStore((s) => s.notify);

  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [shifts, setShifts] = useState(2);

  const schedule = useMemo(() => computeSchedule(project.steps), [project.steps]);
  const contrib = bottleneckContributions(schedule);
  const dist = distribution(project.steps, 8);
  const balance = lineBalancing(schedule);
  const lanes = yamazumi(schedule);
  const paretoData = pareto(project.steps);
  const vari = variability(project.steps);
  const impacts = allStepImpacts(project.steps);
  const opt = suggestOptimization(project.steps);
  const va = vaVsNva(project.steps);
  const tg = taktGap(schedule, project.taktTime);
  const tp = throughput(schedule, project.taktTime, hoursPerDay, shifts);
  const muda = mudaSummary(project.steps);
  const mudaTotal = muda.reduce((a, b) => a + b.seconds, 0);

  const runAutoBalance = () => {
    const { patched } = autoBalance(project.steps, settings.stationCount || 4);
    setSteps(patched);
    notify('Auto line-balance applied (LPT)', 'success');
  };

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-12 gap-4">
        <Panel className="col-span-8" title="Yamazumi · Station Load" tone="cyan"
          right={
            <button className="btn-primary" onClick={runAutoBalance}>
              <IconRefresh className="w-3.5 h-3.5" /> Auto Balance (LPT)
            </button>
          }
        >
          <YamazumiChart lanes={lanes} taktTime={project.taktTime} maxLoad={balance.maxLoad} />
          <div className="grid grid-cols-4 gap-2 mt-3 text-[11px] font-mono">
            <StatBox
              label="Balance Ratio"
              value={`${(balance.balance * 100).toFixed(1)}%`}
              tone={balance.balance >= 0.85 ? 'green' : balance.balance >= 0.7 ? 'cyan' : 'red'}
            />
            <StatBox label="Max Load" value={`${balance.maxLoad.toFixed(1)}s`} tone="red" />
            <StatBox label="Avg Load" value={`${balance.avgLoad.toFixed(1)}s`} tone="cyan" />
            <StatBox label="Stations" value={`${balance.stations.length}`} tone="violet" />
          </div>
        </Panel>

        <Panel className="col-span-4" title="Throughput & Takt" tone="green">
          <div className="grid grid-cols-2 gap-2">
            <NumFieldSm label="Hours / day" value={hoursPerDay} onChange={setHoursPerDay} />
            <NumFieldSm label="Shifts" value={shifts} onChange={setShifts} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <ThroughputBox label="/ Hour" value={tp.perHour.toFixed(1)} tone="cyan" />
            <ThroughputBox label="/ Shift" value={tp.perShift.toFixed(0)} tone="green" />
            <ThroughputBox label="/ Day" value={tp.perDay.toFixed(0)} tone="violet" />
          </div>
          <div className="divider my-3" />
          <Stat label="Takt Gap" value={`${tg.gap.toFixed(1)}s`} tone={tg.meetsTakt ? 'green' : 'red'} sub={`Utilization ${fmtPct((tg.utilization || 0) * 100)}`} />
          <Stat label="Binding cycle" value={`${tp.bindingSeconds.toFixed(1)}s`} tone="cyan" sub={tp.bindingSeconds === project.taktTime ? 'Takt-bound' : 'Cycle-bound'} />
        </Panel>
      </div>

      {/* Pareto + MUDA row */}
      <div className="grid grid-cols-12 gap-4">
        <Panel className="col-span-7" title="Pareto · 80 / 20 Bottleneck" tone="red">
          <ParetoChart data={paretoData} height={260} />
        </Panel>
        <Panel className="col-span-5" title="Muda (7 Wastes)" tone="violet"
          subtitle={mudaTotal > 0 ? `${mudaTotal.toFixed(1)}s total waste tagged` : 'Tag non-value-added steps with a MUDA type'}
        >
          {mudaTotal === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No MUDA tagged. In Cycle Builder, set a MUDA type on NVA steps to classify waste.
            </div>
          ) : (
            <div className="space-y-1.5">
              {muda.map((m) => {
                const pct = mudaTotal ? (m.seconds / mudaTotal) * 100 : 0;
                return (
                  <div key={m.id} className="flex items-center gap-2 text-[12px]">
                    <span className="w-32 truncate text-slate-200">{m.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-black/40 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg,#6D28D9,#E11D2E)',
                        }}
                      />
                    </div>
                    <span className="w-14 text-right font-mono text-slate-300">
                      {m.seconds.toFixed(1)}s
                    </span>
                    <span className="w-12 text-right font-mono text-violet">
                      {pct.toFixed(0)}%
                    </span>
                    <span className="w-8 text-right font-mono text-slate-500">×{m.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-12 gap-4">
        <Panel className="col-span-5" title="Bottleneck Contribution" tone="red">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={contrib.map((c) => ({
                  name: c.stepIds
                    .map((sid) => schedule.steps.find((x) => x.id === sid)?.name)
                    .filter(Boolean)
                    .join(' + '),
                  pct: c.pct,
                  duration: c.duration,
                }))}
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid stroke="rgba(148,163,184,0.08)" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                <YAxis dataKey="name" type="category" width={140} stroke="#94a3b8" fontSize={10} />
                <RTooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, k) => (k === 'pct' ? `${v.toFixed(1)}%` : `${v.toFixed(1)}s`)}
                />
                <Bar dataKey="pct" radius={[4, 4, 4, 4]}>
                  {contrib.map((c, i) => (
                    <Cell
                      key={i}
                      fill={
                        c.pct > 30
                          ? 'url(#g-crit)'
                          : c.pct > 15
                          ? 'url(#g-blue)'
                          : 'url(#g-green)'
                      }
                    />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="g-crit" x1="0" x2="1">
                    <stop offset="0%" stopColor="#E11D2E" />
                    <stop offset="100%" stopColor="#6D28D9" />
                  </linearGradient>
                  <linearGradient id="g-blue" x1="0" x2="1">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#1E40AF" />
                  </linearGradient>
                  <linearGradient id="g-green" x1="0" x2="1">
                    <stop offset="0%" stopColor="#22C55E" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="col-span-4" title="Cycle Time Distribution" tone="cyan">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                <RTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="url(#g-cy)" />
                <defs>
                  <linearGradient id="g-cy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" />
                    <stop offset="100%" stopColor="#1E40AF" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3 text-[11px] font-mono">
            <StatBox label="Min" value={`${vari.min.toFixed(1)}s`} tone="cyan" />
            <StatBox label="Avg" value={`${vari.avg.toFixed(1)}s`} tone="cyan" />
            <StatBox label="Max" value={`${vari.max.toFixed(1)}s`} tone="red" />
            <StatBox label="σ" value={`${vari.std.toFixed(1)}s`} tone="violet" />
          </div>
        </Panel>

        <Panel className="col-span-3" title="VA vs NVA" tone="green">
          <div className="space-y-3">
            <Stat label="Value Added" value={fmtPct(va.vaPct)} tone="green" sub={`${va.va.toFixed(1)}s`} />
            <Stat label="Non Value Added" value={fmtPct(va.nvaPct)} tone="red" sub={`${va.nva.toFixed(1)}s`} />
            <Stat label="Variability σ" value={`${vari.std.toFixed(2)}s`} tone="violet" />
          </div>
        </Panel>
      </div>

      {/* Impacts + AI + multi-line */}
      <div className="grid grid-cols-12 gap-4">
        <Panel className="col-span-6" title="Step Impact Sensitivity" tone="violet"
          subtitle="Seconds saved from total cycle if each step's machine time drops by 1s"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={impacts.slice(0, 15).map((x) => ({
                  name: x.name,
                  saved: Number(x.savedPerSecond.toFixed(2)),
                }))}
              >
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={9}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <RTooltip contentStyle={tooltipStyle} formatter={(v) => `${v}s`} />
                <Line
                  type="monotone"
                  dataKey="saved"
                  stroke="#A78BFA"
                  strokeWidth={2.2}
                  dot={{ r: 3, stroke: '#A78BFA', fill: '#0f172a' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="col-span-6" title="AI Optimization Recommendations" tone="violet"
          right={
            <span className="chip border border-violet/50 bg-violet/10 text-violet">
              <IconSparkles className="w-3 h-3" /> AI
            </span>
          }
        >
          {opt.length === 0 ? (
            <div className="py-6 text-center text-slate-500">
              Process is already lean — no high-leverage reductions found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {opt.map((o) => (
                <div
                  key={o.stepId}
                  className="p-3 rounded-lg border border-violet/30 bg-gradient-to-br from-violet/10 via-transparent to-cyan/10 hover:border-violet/60 hover:shadow-neon-violet transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="chip border border-violet/50 bg-violet/10 text-violet">
                      AI
                    </span>
                    <span className="chip border border-optimal/40 text-optimal bg-optimal/10">
                      +{o.expectedGainSeconds.toFixed(1)}s
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-100 font-semibold truncate">
                    {o.stepName}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{o.rationale}</div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-300">
                    <span>
                      Reduce <b className="text-cyan">{o.reductionPct}%</b> (~{o.reductionSeconds}s)
                    </span>
                    <span>
                      Total <b className="text-optimal">−{o.expectedGainPct.toFixed(1)}%</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Multi-line compare */}
      <Panel
        title="Multi-Line Comparison"
        subtitle="Save current line snapshots to compare lines side-by-side"
        tone="cyan"
        right={
          <button
            className="btn-ghost"
            onClick={() => {
              const e = saveAsLine();
              notify(`Saved line snapshot: ${e.label}`, 'success');
            }}
          >
            <IconSave className="w-3.5 h-3.5" /> Save Current
          </button>
        }
      >
        <MultiLineCompare
          current={{
            label: project.name,
            total: schedule.totalCycleTime,
            va: va.va,
            nva: va.nva,
            takt: project.taktTime,
            bottleneck: schedule.bottleneck?.stepNames?.[0] || '—',
            eff: va.total ? va.va / schedule.totalCycleTime : 0,
          }}
          lines={project.lines || []}
          onRemove={(id) => removeLine(id)}
        />
      </Panel>
    </div>
  );
}

const tooltipStyle = {
  background: 'rgba(15,23,42,0.95)',
  border: '1px solid rgba(6,182,212,0.4)',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 11,
};

function StatBox({ label, value, tone }) {
  const tones = {
    cyan: 'border-cyan/40 text-cyan',
    red: 'border-critical/40 text-critical',
    green: 'border-optimal/40 text-optimal',
    violet: 'border-violet/40 text-violet',
  };
  return (
    <div className={`rounded-md bg-black/30 border px-2 py-1.5 ${tones[tone]}`}>
      <div className="text-[9px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className="font-mono">{value}</div>
    </div>
  );
}

function Stat({ label, value, tone, sub }) {
  const tones = {
    cyan: 'text-cyan',
    red: 'text-critical',
    green: 'text-optimal',
    violet: 'text-violet',
  };
  return (
    <div className="rounded-md border border-white/10 bg-black/30 p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`text-xl font-mono font-semibold mt-1 ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function ThroughputBox({ label, value, tone }) {
  const tones = {
    cyan: 'text-cyan border-cyan/30',
    green: 'text-optimal border-optimal/30',
    violet: 'text-violet border-violet/30',
  };
  return (
    <div className={`rounded-md border bg-black/30 p-2 text-center ${tones[tone]}`}>
      <div className="text-[9px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className="text-lg font-mono font-semibold mt-1">{value}</div>
    </div>
  );
}

function NumFieldSm({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-white/10 bg-black/30">
      <span className="text-[10px] uppercase tracking-widest text-slate-400">{label}</span>
      <input
        type="number"
        value={value}
        min="0"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="bg-transparent outline-none w-14 text-right font-mono text-sm focus:text-cyan"
      />
    </label>
  );
}

function MultiLineCompare({ current, lines, onRemove }) {
  const computed = useMemo(() => {
    return (lines || []).map((l) => {
      const sched = computeSchedule(l.steps);
      const v = vaVsNva(l.steps);
      return {
        id: l.id,
        label: l.label,
        total: sched.totalCycleTime,
        va: v.va,
        nva: v.nva,
        takt: l.taktTime,
        bottleneck: sched.bottleneck?.stepNames?.[0] || '—',
        eff: sched.totalCycleTime ? v.va / sched.totalCycleTime : 0,
        createdAt: l.createdAt,
      };
    });
  }, [lines]);

  const all = [{ ...current, id: '__current', __current: true }, ...computed];
  return (
    <div className="overflow-auto">
      <table className="w-full text-[12px]">
        <thead className="bg-black/40 text-[10px] uppercase tracking-widest text-slate-400">
          <tr>
            <th className="text-left px-3 py-2">Line</th>
            <th className="text-right px-2 py-2">Cycle</th>
            <th className="text-right px-2 py-2">Takt</th>
            <th className="text-right px-2 py-2">VA / NVA</th>
            <th className="text-right px-2 py-2">Efficiency</th>
            <th className="text-left px-2 py-2">Bottleneck</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {all.map((l) => (
            <tr
              key={l.id}
              className={
                'border-t border-white/5 ' + (l.__current ? 'bg-cyan/5 text-slate-100' : '')
              }
            >
              <td className="px-3 py-1.5">
                {l.__current && (
                  <span className="chip border border-cyan/50 bg-cyan/10 text-cyan mr-2">
                    CURRENT
                  </span>
                )}
                {l.label}
              </td>
              <td className="text-right px-2 py-1.5 font-mono">{l.total.toFixed(1)}s</td>
              <td className="text-right px-2 py-1.5 font-mono">{l.takt || 0}s</td>
              <td className="text-right px-2 py-1.5 font-mono">
                <span className="text-optimal">{l.va.toFixed(1)}s</span>
                <span className="text-slate-500"> / </span>
                <span className="text-critical">{l.nva.toFixed(1)}s</span>
              </td>
              <td className="text-right px-2 py-1.5 font-mono">
                {(l.eff * 100).toFixed(1)}%
              </td>
              <td className="px-2 py-1.5 truncate max-w-[200px] text-critical">{l.bottleneck}</td>
              <td className="px-2 py-1.5 text-right">
                {!l.__current && (
                  <button
                    onClick={() => onRemove(l.id)}
                    className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-critical"
                  >
                    remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
