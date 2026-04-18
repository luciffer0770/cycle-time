import React from 'react';
import { useStore } from '../../store/useStore.js';
import { computeSchedule, efficiency } from '../../lib/engine.js';
import { fmtPct, fmtSec } from '../../lib/utils.js';
import {
  IconBolt,
  IconAlert,
  IconClock,
  IconTarget,
  IconUndo,
  IconRedo,
  IconSearch,
  IconHelp,
} from '../ui/Icons.jsx';

export default function TopBar() {
  const project = useStore((s) => s.getActiveProject());
  const setTakt = useStore((s) => s.setTaktTime);
  const setName = useStore((s) => s.setProjectName);
  const canUndo = useStore((s) => s.canUndo());
  const canRedo = useStore((s) => s.canRedo());
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const openCmd = () => useStore.getState().setCommandPaletteOpen(true);
  const openShortcuts = () => useStore.getState().setShortcutsOpen(true);

  const schedule = React.useMemo(
    () => computeSchedule(project?.steps || []),
    [project?.steps],
  );
  const eff = efficiency(schedule);
  const takt = Number(project?.taktTime) || 0;
  const meetsTakt = takt > 0 && schedule.totalCycleTime <= takt;
  const takOver = takt > 0 && !meetsTakt;
  const bnNames = schedule.bottleneck?.stepNames?.join(' + ') || '—';

  if (!project) {
    return (
      <header className="sticky top-0 z-30 border-b border-white/5 bg-black/50 backdrop-blur-xl px-6 py-3">
        <div className="text-sm text-slate-300">No project selected.</div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-black/50 backdrop-blur-xl">
      <div className="flex items-stretch">
        <div className="flex-1 flex items-center gap-4 px-5 py-2.5 min-w-0">
          {/* Project name + takt */}
          <div className="min-w-0 flex-shrink flex flex-col">
            <div className="text-[9px] uppercase tracking-[0.25em] text-slate-500">
              Active Project
            </div>
            <input
              value={project.name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent outline-none text-[15px] font-semibold tracking-tight min-w-0 w-full max-w-[300px] truncate focus:text-cyan border-b border-transparent focus:border-cyan/40 transition"
              title="Rename project"
            />
          </div>

          <TaktInput value={project.taktTime} onChange={setTakt} />

          <Divider />

          <div className="flex items-center gap-2">
            <Metric
              Icon={IconClock}
              label="Cycle Time"
              value={fmtSec(schedule.totalCycleTime, 1)}
              tone="blue"
            />
            <Metric
              Icon={IconBolt}
              label="Efficiency"
              value={fmtPct(eff * 100, 1)}
              tone={eff >= 0.6 ? 'green' : eff >= 0.3 ? 'cyan' : 'red'}
            />
            <Metric
              Icon={IconTarget}
              label="Takt"
              value={takt === 0 ? 'OFF' : meetsTakt ? 'WITHIN' : 'OVER'}
              tone={takt === 0 ? 'cyan' : meetsTakt ? 'green' : 'red'}
              sub={takt === 0 ? '' : `${(schedule.totalCycleTime / takt * 100).toFixed(0)}%`}
            />
          </div>

          <div className="ml-auto flex items-center gap-1 pl-3 border-l border-white/10">
            <IconBtn
              title="Undo (⌘Z)"
              disabled={!canUndo}
              onClick={undo}
            >
              <IconUndo className="w-4 h-4" />
            </IconBtn>
            <IconBtn
              title="Redo (⌘⇧Z)"
              disabled={!canRedo}
              onClick={redo}
            >
              <IconRedo className="w-4 h-4" />
            </IconBtn>
            <button
              onClick={openCmd}
              title="Command palette"
              className="h-9 flex items-center gap-2 px-3 rounded-md border border-white/10 bg-black/30 hover:border-cyan/40 hover:shadow-neon-cyan text-slate-200 transition"
            >
              <IconSearch className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">Commands</span>
              <span className="kbd">⌘K</span>
            </button>
            <IconBtn title="Shortcuts (?)" onClick={openShortcuts}>
              <IconHelp className="w-4 h-4" />
            </IconBtn>
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

function IconBtn({ children, disabled, onClick, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        'h-9 w-9 grid place-items-center rounded-md border transition ' +
        (disabled
          ? 'border-white/5 bg-black/20 text-slate-600 cursor-not-allowed'
          : 'border-white/10 bg-black/30 text-slate-300 hover:text-cyan hover:border-cyan/40 hover:shadow-neon-cyan')
      }
    >
      {children}
    </button>
  );
}

function TaktInput({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 px-3 h-9 rounded-md border border-white/10 bg-black/30 focus-within:border-cyan/60 focus-within:shadow-neon-cyan transition">
      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Takt</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none w-14 text-right font-mono text-sm text-slate-100"
      />
      <span className="text-[10px] text-slate-400 uppercase">s</span>
    </label>
  );
}

const TONE_CLASSES = {
  blue: { ring: 'border-machine/40 shadow-neon-blue', icon: 'text-machine' },
  cyan: { ring: 'border-cyan/40 shadow-neon-cyan', icon: 'text-cyan' },
  green: { ring: 'border-optimal/40 shadow-neon-green', icon: 'text-optimal' },
  red: { ring: 'border-critical/50 shadow-neon-red', icon: 'text-critical' },
  violet: { ring: 'border-violet/40 shadow-neon-violet', icon: 'text-violet' },
};

function Metric({ Icon, label, value, tone = 'cyan', sub }) {
  const t = TONE_CLASSES[tone] || TONE_CLASSES.cyan;
  return (
    <div className={`flex items-center gap-2 px-2.5 h-9 rounded-md border ${t.ring}`}>
      <span className={`grid place-items-center h-6 w-6 rounded bg-black/50 ${t.icon}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="leading-tight">
        <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400">{label}</div>
        <div className="text-[13px] font-semibold font-mono flex items-center gap-1.5">
          {value}
          {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

function BottleneckAlert({ name }) {
  const active = name && name !== '—';
  return (
    <div
      className={
        'flex items-center gap-3 px-3 py-2 rounded-lg border ' +
        (active
          ? 'border-critical/50 bg-critical/10 shadow-neon-red animate-pulse-soft'
          : 'border-white/10 bg-black/30')
      }
    >
      <span
        className={
          'grid place-items-center h-8 w-8 rounded-md ' +
          (active ? 'text-critical' : 'text-slate-400')
        }
      >
        <IconAlert className="w-4.5 h-4.5" />
      </span>
      <div className="leading-tight max-w-[220px]">
        <div className="text-[9px] uppercase tracking-[0.25em] text-slate-400">Bottleneck</div>
        <div
          className={
            'text-[13px] font-semibold truncate ' + (active ? 'text-critical' : 'text-slate-300')
          }
          title={name}
        >
          {name || '—'}
        </div>
      </div>
    </div>
  );
}
