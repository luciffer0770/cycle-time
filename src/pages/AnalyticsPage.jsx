import React, { useMemo } from 'react';
import Panel from '../components/ui/Panel.jsx';
import { useStore } from '../store/useStore.js';
import { computeSchedule } from '../lib/engine.js';
import {
  bottleneckContributions,
  distribution,
  lineBalancing,
  autoBalance,
  variability,
  allStepImpacts,
  suggestOptimization,
  vaVsNva,
  taktGap,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import { fmtPct, fmtSec } from '../lib/utils.js';
import { IconSparkles, IconRefresh, IconSave } from '../components/ui/Icons.jsx';

export default function AnalyticsPage() {
  const project = useStore((s) => s.project);
  const settings = useStore((s) => s.settings);
  const setSteps = useStore((s) => s.setSteps);
  const saveAsLine = useStore((s) => s.saveAsLine);
  const removeLine = useStore((s) => s.removeLine);
  const notify = useStore((s) => s.notify);

  const schedule = useMemo(() => computeSchedule(project.steps), [project.steps]);
  const contrib = bottleneckContributions(schedule);
  const dist = distribution(project.steps, 8);
  const balance = lineBalancing(schedule);
  const vari = variability(project.steps);
  const impacts = allStepImpacts(project.steps);
  const opt = suggestOptimization(project.steps);
  const va = vaVsNva(project.steps);
  const tg = taktGap(schedule, project.taktTime);

  const runAutoBalance = () => {
    const { patched } = autoBalance(project.steps, settings.stationCount || 4);
    setSteps(patched);
    notify('Auto line-balance applied (LPT)', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Top row */}
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

        <Panel className="col-span-3" title="Takt & VA" tone="green">
          <div className="space-y-3">
            <Metric
              label="Takt Gap"
              value={`${tg.gap.toFixed(1)}s`}
              tone={tg.meetsTakt ? 'green' : 'red'}
              footer={`Utilization ${fmtPct((tg.utilization || 0) * 100)}`}
            />
            <Metric label="Value Added" value={fmtPct(va.vaPct)} tone="green" />
            <Metric label="Non Value Added" value={fmtPct(va.nvaPct)} tone="red" />
            <Metric
              label="Variability (σ)"
              value={`${vari.std.toFixed(2)}s`}
              tone="violet"
            />
          </div>
        </Panel>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-12 gap-4">
        <Panel
          className="col-span-6"
          title="Line Balancing"
          subtitle="Load per station (seconds)"
          tone="cyan"
          right={
            <button className="btn-primary" onClick={runAutoBalance}>
              <IconRefresh className="w-3.5 h-3.5" /> Auto Balance (LPT)
            </button>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={balance.stations.map((s) => ({
                  station: s.stationId,
                  load: Number(s.load.toFixed(2)),
                }))}
              >
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="station" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <RTooltip contentStyle={tooltipStyle} formatter={(v) => `${v}s`} />
                <Bar dataKey="load" radius={[4, 4, 0, 0]}>
                  {balance.stations.map((s, i) => (
                    <Cell
                      key={i}
                      fill={
                        s.load >= balance.maxLoad * 0.95
                          ? 'url(#g-crit)'
                          : s.load <= balance.avgLoad * 0.8
                          ? 'url(#g-green)'
                          : 'url(#g-blue)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-mono">
            <StatBox
              label="Balance Ratio"
              value={`${(balance.balance * 100).toFixed(1)}%`}
              tone="green"
            />
            <StatBox label="Max Load" value={`${balance.maxLoad.toFixed(1)}s`} tone="red" />
            <StatBox label="Avg Load" value={`${balance.avgLoad.toFixed(1)}s`} tone="cyan" />
          </div>
        </Panel>

        <Panel className="col-span-6" title="Step Impact Sensitivity" tone="violet">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={impacts.slice(0, 15).map((x) => ({
                  name: x.name,
                  saved: Number(x.savedPerSecond.toFixed(2)),
                }))}
              >
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <RTooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => `${v}s saved per 1s reduced`}
                />
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
          <div className="text-[11px] text-slate-400 mt-2">
            Shows how much total cycle time drops if each step's machine time is reduced by 1
            second. Non-critical steps have zero leverage.
          </div>
        </Panel>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-12 gap-4">
        <Panel className="col-span-7" title="AI Optimization Recommendations" tone="violet">
          {opt.length === 0 ? (
            <div className="py-6 text-center text-slate-500">
              Steps look lean — no leverage points detected.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {opt.map((o) => (
                <div
                  key={o.stepId}
                  className="relative p-3 rounded-lg border border-violet/30 bg-gradient-to-br from-violet/15 via-transparent to-cyan/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="chip border border-violet/50 bg-violet/10 text-violet">
                      <IconSparkles className="w-3 h-3" /> AI
                    </span>
                    <span className="chip border border-optimal/40 text-optimal bg-optimal/10">
                      +{o.expectedGainSeconds.toFixed(1)}s
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-100 font-semibold">{o.stepName}</div>
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

        <Panel
          className="col-span-5"
          title="Multi-Line Comparison"
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

function Metric({ label, value, tone, footer }) {
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
      {footer && <div className="text-[11px] text-slate-500 mt-1">{footer}</div>}
    </div>
  );
}

function MultiLineCompare({ current, lines, onRemove }) {
  const all = [
    { id: '__current', label: `${current.label} (current)`, ...current, createdAt: 'now', __current: true },
    ...lines.map((l) => {
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
    }),
  ];

  return (
    <div className="space-y-2 max-h-[320px] overflow-auto">
      {all.map((l) => (
        <div
          key={l.id}
          className="rounded-md border border-white/10 bg-black/30 p-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-100 truncate">{l.label}</div>
            {!l.__current && (
              <button
                onClick={() => onRemove(l.id)}
                className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-critical"
              >
                remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2 text-[11px] font-mono">
            <Mini label="Cycle" value={`${l.total.toFixed(1)}s`} tone="cyan" />
            <Mini label="Takt" value={`${l.takt || 0}s`} tone="violet" />
            <Mini label="Eff" value={`${(l.eff * 100).toFixed(1)}%`} tone="green" />
            <Mini label="BN" value={l.bottleneck} tone="red" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Mini({ label, value, tone }) {
  const tones = { cyan: 'text-cyan', red: 'text-critical', green: 'text-optimal', violet: 'text-violet' };
  return (
    <div className="rounded-sm bg-black/40 border border-white/5 px-1.5 py-1">
      <div className="text-[8px] uppercase text-slate-500 tracking-widest">{label}</div>
      <div className={`truncate ${tones[tone]}`}>{value}</div>
    </div>
  );
}
