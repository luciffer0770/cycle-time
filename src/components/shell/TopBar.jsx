import React from 'react';
import { useStore } from '../../store/useStore.js';
import { computeSchedule, efficiency } from '../../lib/engine.js';
import { fmtPct, fmtSec } from '../../lib/utils.js';
import { IconBolt, IconAlert, IconClock, IconTarget } from '../ui/Icons.jsx';

export default function TopBar() {
  const project = useStore((s) => s.project);
  const setTakt = useStore((s) => s.setTaktTime);
  const setName = useStore((s) => s.setProjectName);

  const schedule = React.useMemo(() => computeSchedule(project.steps), [project.steps]);
  const eff = efficiency(schedule);
  const takt = Number(project.taktTime) || 0;
  const meetsTakt = takt > 0 && schedule.totalCycleTime <= takt;
  const bnNames = schedule.bottleneck?.stepNames?.join(' + ') || '—';

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-black/50 backdrop-blur-xl">
      <div className="flex items-stretch">
        <div className="flex-1 flex items-center gap-6 px-6 py-3">
          <div className="min-w-[260px]">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Active Project
            </div>
            <input
              value={project.name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent outline-none text-lg font-semibold tracking-tight w-full focus:text-cyan transition"
            />
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <TaktInput value={project.taktTime} onChange={setTakt} />
            <Divider />
            <Metric
              Icon={IconClock}
              label="Cycle Time"
              value={fmtSec(schedule.totalCycleTime, 1)}
              tone="blue"
            />
            <Divider />
            <Metric
              Icon={IconBolt}
              label="Efficiency"
              value={fmtPct(eff * 100, 1)}
              tone={eff >= 0.6 ? 'green' : eff >= 0.3 ? 'cyan' : 'red'}
            />
            <Divider />
            <Metric
              Icon={IconTarget}
              label="Takt Status"
              value={takt === 0 ? '—' : meetsTakt ? 'WITHIN' : 'OVER'}
              tone={takt === 0 ? 'cyan' : meetsTakt ? 'green' : 'red'}
            />
          </div>
        </div>

        <div className="flex items-center px-4 border-l border-white/5">
          <BottleneckAlert name={bnNames} />
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-cyan/0 via-cyan/40 to-violet/0" />
    </header>
  );
}

function Divider() {
  return <span className="h-8 w-px bg-white/10" />;
}

function TaktInput({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-black/30 focus-within:border-cyan/60 focus-within:shadow-neon-cyan transition">
      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Takt</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none w-16 text-right font-mono text-sm text-slate-100"
      />
      <span className="text-[10px] text-slate-400 uppercase">sec</span>
    </label>
  );
}

const TONE_CLASSES = {
  blue: { icon: 'text-machine', glow: 'shadow-neon-blue', ring: 'border-machine/40' },
  cyan: { icon: 'text-cyan', glow: 'shadow-neon-cyan', ring: 'border-cyan/40' },
  green: { icon: 'text-optimal', glow: 'shadow-neon-green', ring: 'border-optimal/40' },
  red: { icon: 'text-critical', glow: 'shadow-neon-red', ring: 'border-critical/50' },
  violet: { icon: 'text-violet', glow: 'shadow-neon-violet', ring: 'border-violet/40' },
};

function Metric({ Icon, label, value, tone = 'cyan' }) {
  const t = TONE_CLASSES[tone] || TONE_CLASSES.cyan;
  return (
    <div className={`flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-md border ${t.ring} ${t.glow}`}>
      <span className={`grid place-items-center h-7 w-7 rounded-md bg-black/50 ${t.icon}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="leading-tight">
        <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</div>
        <div className="text-sm font-semibold font-mono">{value}</div>
      </div>
    </div>
  );
}

function BottleneckAlert({ name }) {
  const active = name && name !== '—';
  return (
    <div
      className={
        'flex items-center gap-3 px-3.5 py-2 rounded-lg border ' +
        (active
          ? 'border-critical/50 bg-critical/10 shadow-neon-red animate-pulse-soft'
          : 'border-white/10 bg-black/30')
      }
    >
      <span
        className={
          'grid place-items-center h-9 w-9 rounded-md ' +
          (active ? 'text-critical' : 'text-slate-400')
        }
      >
        <IconAlert className="w-5 h-5" />
      </span>
      <div className="leading-tight max-w-[260px]">
        <div className="text-[9px] uppercase tracking-[0.25em] text-slate-400">
          Bottleneck
        </div>
        <div
          className={
            'text-sm font-semibold truncate ' + (active ? 'text-critical' : 'text-slate-300')
          }
          title={name}
        >
          {name || '—'}
        </div>
      </div>
    </div>
  );
}
