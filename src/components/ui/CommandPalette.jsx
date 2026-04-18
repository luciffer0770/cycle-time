import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore.js';
import { TEMPLATES } from '../../lib/templates.js';
import { downloadProjectJson } from '../../lib/project-io.js';
import { exportStepsToXlsx } from '../../lib/excel.js';
import { exportReportPdf } from '../../lib/pdf.js';
import { IconSearch, IconArrowRight } from './Icons.jsx';

export default function CommandPalette() {
  const open = useStore((s) => s.commandPaletteOpen);
  const close = () => useStore.getState().setCommandPaletteOpen(false);
  const nav = useNavigate();
  const project = useStore((s) => s.getActiveProject());
  const projects = useStore((s) => s.getProjects());
  const setActive = useStore((s) => s.setActiveProject);
  const createProject = useStore((s) => s.createProject);
  const loadTemplate = useStore((s) => s.loadTemplateIntoActive);
  const saveVersion = useStore((s) => s.saveVersion);
  const notify = useStore((s) => s.notify);
  const settings = useStore((s) => s.settings);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setShortcuts = useStore((s) => s.setShortcutsOpen);

  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands = useMemo(() => {
    const list = [];
    // Navigation
    const navs = [
      ['Go to Dashboard', '/dashboard', 'nav', 'g d'],
      ['Go to Cycle Builder', '/builder', 'nav', 'g b'],
      ['Go to Gantt View', '/gantt', 'nav', 'g g'],
      ['Go to Analytics', '/analytics', 'nav', 'g a'],
      ['Go to Simulation', '/simulation', 'nav', 'g s'],
      ['Go to Reports', '/reports', 'nav', 'g r'],
      ['Go to Settings', '/settings', 'nav', 'g t'],
    ];
    navs.forEach(([label, path, group, shortcut]) =>
      list.push({
        id: `nav:${path}`,
        group,
        label,
        shortcut,
        run: () => {
          nav(path);
          close();
        },
      }),
    );

    // Project switcher
    projects.forEach((p) =>
      list.push({
        id: `open:${p.id}`,
        group: 'project',
        label: `Open project · ${p.name}`,
        run: () => {
          setActive(p.id);
          notify(`Opened ${p.name}`, 'info');
          close();
        },
      }),
    );

    // Project actions
    list.push({
      id: 'new-project',
      group: 'project',
      label: 'New Project…',
      run: () => {
        const p = createProject('cnc-machining', 'Untitled Project');
        notify(`Created ${p.name}`, 'success');
        nav('/builder');
        close();
      },
    });
    list.push({
      id: 'save-version',
      group: 'project',
      label: 'Save Version (snapshot)',
      run: () => {
        const v = saveVersion(`Snapshot ${new Date().toLocaleTimeString()}`);
        notify(`Saved ${v.label}`, 'success');
        close();
      },
    });
    list.push({
      id: 'export-json',
      group: 'project',
      label: 'Export project as JSON',
      run: () => {
        downloadProjectJson(project);
        notify('Exported JSON', 'success');
        close();
      },
    });
    list.push({
      id: 'export-xlsx',
      group: 'project',
      label: 'Export steps as Excel',
      run: () => {
        exportStepsToXlsx(project);
        notify('Exported Excel', 'success');
        close();
      },
    });
    list.push({
      id: 'export-pdf',
      group: 'project',
      label: 'Export PDF report',
      run: () => {
        exportReportPdf(project, settings);
        notify('Exported PDF', 'success');
        close();
      },
    });

    // Templates
    TEMPLATES.forEach((t) =>
      list.push({
        id: `tmpl:${t.id}`,
        group: 'template',
        label: `Load template · ${t.name}`,
        run: () => {
          loadTemplate(t.id);
          notify(`Loaded ${t.name}`, 'success');
          nav('/builder');
          close();
        },
      }),
    );

    // UI
    list.push({
      id: 'toggle-sidebar',
      group: 'ui',
      label: settings.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar',
      run: () => {
        toggleSidebar();
        close();
      },
    });
    list.push({
      id: 'show-shortcuts',
      group: 'ui',
      label: 'Show keyboard shortcuts',
      shortcut: '?',
      run: () => {
        setShortcuts(true);
        close();
      },
    });
    return list;
  }, [projects, project, settings, nav, setActive, createProject, loadTemplate, saveVersion, notify, toggleSidebar, setShortcuts]);

  const filtered = useMemo(() => {
    if (!q.trim()) return commands;
    const needle = q.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(needle));
  }, [q, commands]);

  useEffect(() => {
    if (cursor >= filtered.length) setCursor(0);
  }, [filtered.length, cursor]);

  if (!open) return null;

  const runCurrent = () => {
    const cmd = filtered[cursor];
    if (cmd) cmd.run();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24"
      onClick={close}
    >
      <div
        className="w-[640px] max-w-[92vw] glass-strong rounded-xl border border-cyan/40 shadow-neon-cyan overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
          <IconSearch className="w-4 h-4 text-cyan" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
              else if (e.key === 'ArrowDown')
                setCursor((c) => Math.min(c + 1, filtered.length - 1));
              else if (e.key === 'ArrowUp') setCursor((c) => Math.max(c - 1, 0));
              else if (e.key === 'Enter') runCurrent();
            }}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500"
          />
          <span className="kbd">ESC</span>
        </div>
        <div className="max-h-[50vh] overflow-auto py-1">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500">No matches.</div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setCursor(i)}
              onClick={c.run}
              className={
                'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition ' +
                (cursor === i
                  ? 'bg-cyan/15 text-white border-l-2 border-cyan'
                  : 'text-slate-200 border-l-2 border-transparent hover:bg-white/5')
              }
            >
              <span
                className={
                  'text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border ' +
                  (c.group === 'nav'
                    ? 'border-cyan/40 text-cyan bg-cyan/10'
                    : c.group === 'project'
                    ? 'border-violet/40 text-violet bg-violet/10'
                    : c.group === 'template'
                    ? 'border-optimal/40 text-optimal bg-optimal/10'
                    : 'border-slate-500/40 text-slate-400 bg-white/5')
                }
              >
                {c.group}
              </span>
              <span className="flex-1 truncate">{c.label}</span>
              {c.shortcut && <span className="kbd">{c.shortcut}</span>}
              <IconArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 text-[11px] text-slate-500">
          <span>
            <span className="kbd">↑</span> <span className="kbd">↓</span> Navigate ·{' '}
            <span className="kbd">↵</span> Run
          </span>
          <span>
            <span className="kbd">⌘/Ctrl</span> + <span className="kbd">K</span> to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
