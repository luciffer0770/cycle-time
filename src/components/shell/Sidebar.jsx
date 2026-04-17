import React from 'react';
import { NavLink } from 'react-router-dom';
import { classNames } from '../../lib/utils.js';
import {
  IconDashboard,
  IconBuilder,
  IconGantt,
  IconAnalytics,
  IconSimulation,
  IconReport,
  IconSettings,
} from '../ui/Icons.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard, hint: 'Overview' },
  { to: '/builder', label: 'Cycle Builder', Icon: IconBuilder, hint: 'Steps · DAG' },
  { to: '/gantt', label: 'Gantt View', Icon: IconGantt, hint: 'Blueprint' },
  { to: '/analytics', label: 'Analytics', Icon: IconAnalytics, hint: 'Deep insights' },
  { to: '/simulation', label: 'Simulation', Icon: IconSimulation, hint: 'What-if' },
  { to: '/reports', label: 'Reports', Icon: IconReport, hint: 'PDF · Excel' },
  { to: '/settings', label: 'Settings', Icon: IconSettings, hint: 'Defaults' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-white/5 bg-black/30 backdrop-blur-xl flex flex-col">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
        <LogoMark />
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-cyan/80 font-semibold">
            Industrial
          </div>
          <div className="font-semibold text-[15px] leading-tight">
            <span className="text-gradient-cool">Cycle Time</span>
            <span className="text-slate-200"> Analyzer</span>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {NAV.map(({ to, label, Icon, hint }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              classNames(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                'border border-transparent',
                isActive
                  ? 'bg-gradient-to-r from-cyan/10 via-violet/10 to-transparent border-cyan/30 shadow-neon-cyan'
                  : 'hover:bg-white/5 hover:border-white/10',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={classNames(
                    'h-8 w-8 rounded-md grid place-items-center border border-white/10 bg-black/40',
                    isActive
                      ? 'text-cyan border-cyan/50 shadow-neon-cyan'
                      : 'text-slate-300 group-hover:text-cyan',
                  )}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1">
                  <div
                    className={classNames(
                      'text-sm font-medium leading-none',
                      isActive ? 'text-white' : 'text-slate-200',
                    )}
                  >
                    {label}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                    {hint}
                  </div>
                </div>
                {isActive && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-cyan shadow-neon-cyan animate-pulse-soft" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-3 border-t border-white/5">
        <div className="glass-strong p-3 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-optimal shadow-neon-green animate-pulse-soft" />
            <span className="text-[11px] uppercase tracking-widest text-slate-300">
              Local Session
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            All data stored in browser. No server connection required.
          </p>
        </div>
      </div>
    </aside>
  );
}

function LogoMark() {
  return (
    <div className="relative h-10 w-10 rounded-lg grid place-items-center bg-gradient-to-br from-cyan/30 via-violet/30 to-critical/30 border border-cyan/30 shadow-neon-cyan">
      <svg viewBox="0 0 48 48" className="w-6 h-6">
        <defs>
          <linearGradient id="lg1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="60%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="16" fill="none" stroke="url(#lg1)" strokeWidth="2.5" />
        <path d="M10 30 L20 20 L26 26 L38 14" fill="none" stroke="url(#lg1)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="38" cy="14" r="2.5" fill="#22C55E" />
      </svg>
      <span className="absolute inset-0 rounded-lg animate-glow-pulse pointer-events-none" />
    </div>
  );
}
