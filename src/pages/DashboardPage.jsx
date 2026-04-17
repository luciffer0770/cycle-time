import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore.js';
import { computeSchedule, efficiency, oee } from '../lib/engine.js';
import {
  bottleneckContributions,
  vaVsNva,
  taktGap,
  variability,
  suggestOptimization,
} from '../lib/analytics.js';
import { fmtPct, fmtSec } from '../lib/utils.js';
import KpiCard from '../components/ui/KpiCard.jsx';
import Panel from '../components/ui/Panel.jsx';
import Gantt from '../components/gantt/Gantt.jsx';
import {
  IconClock,
  IconBolt,
  IconAlert,
  IconTarget,
  IconSparkles,
  IconArrowRight,
  IconLayers,
} from '../components/ui/Icons.jsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from 'recharts';

export default function DashboardPage() {
  const project = useStore((s) => s.project);
  const settings = useStore((s) => s.settings);
  const nav = useNavigate();

  const schedule = useMemo(() => computeSchedule(project.steps), [project.steps]);
  const eff = efficiency(schedule);
  const tg = taktGap(schedule, project.taktTime);
  const va = vaVsNva(project.steps);
  const vari = variability(project.steps);
  const contrib = bottleneckContributions(schedule);
  const optim = suggestOptimization(project.steps);
  const o = oee(settings.oee);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <KpiCard
            label="Total Cycle Time"
            value={fmtSec(schedule.totalCycleTime, 1)}
            sub={`${schedule.steps.length} steps · ${schedule.criticalPath.length} critical`}
            tone="blue"
            Icon={IconClock}
            footer={`Takt gap ${tg.gap.toFixed(1)}s`}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Efficiency"
            value={fmtPct(eff * 100, 1)}
            sub={`VA ${fmtSec(va.va)} / NVA ${fmtSec(va.nva)}`}
            tone="green"
            Icon={IconBolt}
            pulse
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Bottleneck"
            value={schedule.bottleneck?.stepNames?.[0] || '—'}
            sub={
              schedule.bottleneck
                ? `${schedule.bottleneck.duration.toFixed(1)}s · ${schedule.bottleneck.kind.toUpperCase()}`
                : 'No steps'
            }
            tone="red"
            Icon={IconAlert}
            pulse
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="OEE"
            value={fmtPct(o.oee * 100, 1)}
            sub={`A ${fmtPct(o.availability * 100, 0)} · P ${fmtPct(
              o.performance * 100,
              0,
            )} · Q ${fmtPct(o.quality * 100, 0)}`}
            tone="violet"
            Icon={IconTarget}
          />
        </div>
      </div>

      {/* Mini Gantt + Bottleneck bars */}
      <div className="grid grid-cols-12 gap-4">
        <Panel
          className="col-span-8"
          title="Mini Gantt · Critical Path"
          subtitle={
            project.steps.length
              ? 'Live schedule view with takt line'
              : 'Add steps to visualize the schedule'
          }
          tone="cyan"
          right={
            <button className="btn-ghost" onClick={() => nav('/gantt')}>
              Full view <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <Gantt
            steps={project.steps.slice(0, 10)}
            taktTime={project.taktTime}
            compact
          />
        </Panel>

        <Panel className="col-span-4" title="Critical Path Contribution" tone="red">
          {contrib.length === 0 ? (
            <EmptyState msg="No critical path yet." />
          ) : (
            <div className="space-y-3">
              {contrib.slice(0, 6).map((c) => {
                const names = c.stepIds
                  .map((sid) => schedule.steps.find((x) => x.id === sid)?.name)
                  .filter(Boolean)
                  .join(' + ');
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="truncate text-slate-200">{names}</span>
                      <span className="font-mono text-slate-400">
                        {c.duration.toFixed(1)}s · {c.pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${c.pct}%`,
                          background:
                            c.pct > 30
                              ? 'linear-gradient(90deg, #E11D2E, #F43F5E)'
                              : c.pct > 15
                              ? 'linear-gradient(90deg, #1E40AF, #06B6D4)'
                              : 'linear-gradient(90deg, #22C55E, #06B6D4)',
                          boxShadow:
                            c.pct > 30
                              ? '0 0 16px -4px rgba(225,29,46,0.7)'
                              : '0 0 12px -4px rgba(6,182,212,0.5)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-12 gap-4">
        <Panel className="col-span-4" title="Cycle Time Distribution" tone="cyan">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={project.steps.map((s) => ({ name: s.name, ct: s.machineTime + s.operatorTime + s.setupTime }))}
              >
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <RTooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(6,182,212,0.4)',
                    borderRadius: 8,
                    color: '#e2e8f0',
                  }}
                  cursor={{ fill: 'rgba(6,182,212,0.08)' }}
                />
                <Bar dataKey="ct" radius={[4, 4, 0, 0]}>
                  {project.steps.map((s, i) => (
                    <Cell
                      key={s.id}
                      fill={
                        schedule.bottleneck?.stepIds?.includes(s.id)
                          ? 'url(#bn-grad)'
                          : 'url(#cy-grad)'
                      }
                    />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="bn-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E11D2E" />
                    <stop offset="100%" stopColor="#6D28D9" />
                  </linearGradient>
                  <linearGradient id="cy-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" />
                    <stop offset="100%" stopColor="#1E40AF" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] font-mono">
            <Stat label="Min" value={`${vari.min.toFixed(1)}s`} />
            <Stat label="Avg" value={`${vari.avg.toFixed(1)}s`} />
            <Stat label="Max" value={`${vari.max.toFixed(1)}s`} />
            <Stat label="σ" value={`${vari.std.toFixed(1)}s`} />
          </div>
        </Panel>

        <Panel className="col-span-4" title="VA vs NVA" tone="green">
          <Donut va={va.va} nva={va.nva} />
        </Panel>

        <Panel
          className="col-span-4"
          title="AI Optimization"
          subtitle="Top candidates by cycle-time leverage"
          tone="violet"
          right={
            <span className="chip border border-violet/50 bg-violet/10 text-violet">
              <IconSparkles className="w-3 h-3" /> AI
            </span>
          }
        >
          {optim.length === 0 ? (
            <EmptyState msg="Add steps to unlock recommendations." />
          ) : (
            <ul className="space-y-2">
              {optim.slice(0, 4).map((o) => (
                <li
                  key={o.stepId}
                  className="rounded-md border border-white/10 bg-black/30 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-100 truncate" title={o.stepName}>
                      {o.stepName}
                    </span>
                    <span className="chip border border-optimal/40 text-optimal bg-optimal/10">
                      +{o.expectedGainSeconds.toFixed(1)}s
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    −{o.reductionPct}% ({o.reductionSeconds}s) · {o.rationale}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-12 gap-4">
        <Panel className="col-span-12" title="Quick Actions" tone="cyan">
          <div className="flex flex-wrap gap-3">
            <ActionTile
              Icon={IconLayers}
              label="Open Cycle Builder"
              desc="Create, edit, and link steps"
              onClick={() => nav('/builder')}
            />
            <ActionTile
              Icon={IconArrowRight}
              label="Run Simulation"
              desc="Before / After comparison"
              onClick={() => nav('/simulation')}
            />
            <ActionTile
              Icon={IconSparkles}
              label="View Analytics"
              desc="Line balancing, histograms"
              onClick={() => nav('/analytics')}
            />
            <ActionTile
              Icon={IconTarget}
              label="Export Report"
              desc="PDF & Excel"
              onClick={() => nav('/reports')}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className="text-slate-100">{value}</div>
    </div>
  );
}

function ActionTile({ Icon, label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-white/10 bg-black/30 hover:border-cyan/50 hover:shadow-neon-cyan transition-all"
    >
      <span className="h-10 w-10 rounded-md grid place-items-center border border-white/10 bg-black/40 text-cyan group-hover:shadow-neon-cyan transition">
        <Icon className="w-5 h-5" />
      </span>
      <div className="text-left">
        <div className="text-sm text-slate-100">{label}</div>
        <div className="text-[11px] text-slate-400">{desc}</div>
      </div>
    </button>
  );
}

function Donut({ va, nva }) {
  const total = Math.max(va + nva, 0.0001);
  const vaFrac = va / total;
  const R = 64;
  const C = 2 * Math.PI * R;
  const vaLen = C * vaFrac;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 160 160" className="w-36 h-36">
        <defs>
          <linearGradient id="va-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="nva-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E11D2E" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <circle cx="80" cy="80" r={R} fill="none" stroke="url(#nva-grad)" strokeWidth="14" />
        <circle
          cx="80"
          cy="80"
          r={R}
          fill="none"
          stroke="url(#va-grad)"
          strokeWidth="14"
          strokeDasharray={`${vaLen} ${C - vaLen}`}
          strokeDashoffset={C / 4}
          transform="rotate(-90 80 80)"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.5))' }}
        />
        <text
          x="80"
          y="74"
          textAnchor="middle"
          fontSize="20"
          fontFamily="JetBrains Mono, monospace"
          fill="#22c55e"
          fontWeight="600"
        >
          {(vaFrac * 100).toFixed(0)}%
        </text>
        <text x="80" y="92" textAnchor="middle" fontSize="10" fill="#94a3b8">
          VALUE ADDED
        </text>
      </svg>
      <div className="space-y-2 flex-1">
        <LegendRow color="optimal" label="Value-added" value={`${va.toFixed(1)}s`} />
        <LegendRow color="critical" label="Non-value-added" value={`${nva.toFixed(1)}s`} />
        <div className="text-[11px] text-slate-400 pt-2 border-t border-white/5">
          Total process content: <span className="font-mono text-slate-200">{(va + nva).toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }) {
  const map = {
    optimal: 'bg-gradient-to-r from-optimal to-cyan shadow-neon-green',
    critical: 'bg-gradient-to-r from-critical to-violet shadow-neon-red',
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-2.5 w-6 rounded ${map[color]}`} />
      <span className="text-slate-200">{label}</span>
      <span className="ml-auto font-mono text-slate-400">{value}</span>
    </div>
  );
}

function EmptyState({ msg }) {
  return <div className="py-10 text-center text-sm text-slate-500">{msg}</div>;
}
