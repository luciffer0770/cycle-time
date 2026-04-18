import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { classNames } from '../../lib/utils.js';
import { useStore } from '../../store/useStore.js';
import {
  IconDashboard,
  IconBuilder,
  IconGantt,
  IconAnalytics,
  IconSimulation,
  IconReport,
  IconSettings,
  IconPlus,
  IconCopy,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
} from '../ui/Icons.jsx';
import { TEMPLATES } from '../../lib/templates.js';

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
  const collapsed = useStore((s) => s.settings.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const project = useStore((s) => s.getActiveProject());
  const projects = useStore((s) => s.getProjects());
  const setActive = useStore((s) => s.setActiveProject);
  const createProject = useStore((s) => s.createProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const removeProject = useStore((s) => s.removeProject);
  const notify = useStore((s) => s.notify);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <aside
      className={classNames(
        'shrink-0 border-r border-white/5 bg-black/30 backdrop-blur-xl flex flex-col relative transition-[width] duration-200',
        collapsed ? 'w-[74px]' : 'w-[264px]',
      )}
    >
      <div
        className={classNames(
          'flex items-center gap-3 border-b border-white/5 h-[72px]',
          collapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        <LogoMark />
        {!collapsed && (
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan/80 font-semibold">
              Industrial
            </div>
            <div className="font-semibold text-[14px] leading-tight">
              <span className="text-gradient-cool">Cycle Time</span>
              <span className="text-slate-200"> Analyzer</span>
            </div>
          </div>
        )}
      </div>

      {/* Project switcher */}
      {!collapsed && (
        <div className="p-3 border-b border-white/5 relative">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-black/30 hover:border-cyan/40 hover:bg-black/50 transition"
          >
            <span className="h-2 w-2 rounded-full bg-cyan shadow-neon-cyan" />
            <div className="flex-1 text-left min-w-0">
              <div className="text-[9px] uppercase tracking-widest text-slate-400">
                Active Project
              </div>
              <div className="text-sm text-slate-100 truncate">
                {project?.name || 'No project'}
              </div>
            </div>
            <svg viewBox="0 0 20 20" className="w-3 h-3 text-slate-400">
              <path
                fill="currentColor"
                d="M5 8l5 5 5-5z"
                transform={switcherOpen ? 'rotate(180 10 10)' : ''}
              />
            </svg>
          </button>

          {switcherOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 z-30 glass-strong rounded-md border border-cyan/30 shadow-neon-cyan">
              <div className="max-h-[280px] overflow-auto py-1">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className={classNames(
                      'group flex items-center gap-2 px-3 py-2 cursor-pointer border-l-2 text-sm transition',
                      p.id === project?.id
                        ? 'border-cyan bg-cyan/10 text-white'
                        : 'border-transparent hover:bg-white/5 text-slate-200',
                    )}
                    onClick={() => {
                      setActive(p.id);
                      setSwitcherOpen(false);
                    }}
                  >
                    <div className="flex-1 truncate">{p.name}</div>
                    <button
                      title="Duplicate"
                      className="h-6 w-6 grid place-items-center rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:text-cyan hover:bg-cyan/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateProject(p.id);
                      }}
                    >
                      <IconCopy className="w-3 h-3" />
                    </button>
                    <button
                      title="Delete"
                      className="h-6 w-6 grid place-items-center rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:text-critical hover:bg-critical/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (projects.length <= 1) {
                          notify('Cannot delete the only project', 'warning');
                          return;
                        }
                        removeProject(p.id);
                      }}
                    >
                      <IconTrash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 p-2 space-y-1">
                <div className="text-[9px] uppercase tracking-widest text-slate-500 px-1">
                  New from template
                </div>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const p = createProject(t.id, t.name);
                      setSwitcherOpen(false);
                      notify(`Created ${p.name}`, 'success');
                    }}
                    className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded text-[12px] hover:bg-white/5"
                  >
                    <IconPlus className="w-3 h-3 text-cyan" />
                    <span className="truncate text-slate-200">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <nav className={classNames('p-2 space-y-1 flex-1', collapsed && 'px-2')}>
        {NAV.map(({ to, label, Icon, hint }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              classNames(
                'group relative flex items-center gap-3 rounded-lg transition-all',
                'border border-transparent',
                collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5',
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
                    'h-8 w-8 rounded-md grid place-items-center border border-white/10 bg-black/40 shrink-0',
                    isActive
                      ? 'text-cyan border-cyan/50 shadow-neon-cyan'
                      : 'text-slate-300 group-hover:text-cyan',
                  )}
                >
                  <Icon className="w-4 h-4" />
                </span>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
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
                )}
                {!collapsed && isActive && (
                  <span className="h-2 w-2 rounded-full bg-cyan shadow-neon-cyan animate-pulse-soft" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-3 border-t border-white/5 space-y-2">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-md border border-white/10 bg-black/30 hover:border-cyan/40 hover:bg-black/50 text-slate-300 hover:text-cyan transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <IconChevronRight className="w-4 h-4" />
          ) : (
            <>
              <IconChevronLeft className="w-4 h-4" />
              <span className="text-[11px] uppercase tracking-widest">Collapse</span>
            </>
          )}
        </button>
        {!collapsed && (
          <div className="glass-strong p-3 rounded-lg border border-white/10">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-optimal shadow-neon-green animate-pulse-soft" />
              <span className="text-[11px] uppercase tracking-widest text-slate-300">
                Local Session
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              Press <span className="kbd">⌘</span> <span className="kbd">K</span> for commands.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function LogoMark() {
  return (
    <div className="relative h-10 w-10 rounded-lg grid place-items-center bg-gradient-to-br from-cyan/30 via-violet/30 to-critical/30 border border-cyan/30 shadow-neon-cyan shrink-0">
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
