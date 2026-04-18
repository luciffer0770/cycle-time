import React from 'react';
import { useStore } from '../../store/useStore.js';

const SHORTCUTS = [
  { group: 'Navigation', items: [
    ['Command palette', '⌘/Ctrl + K'],
    ['Go to Dashboard', 'g then d'],
    ['Go to Cycle Builder', 'g then b'],
    ['Go to Gantt View', 'g then g'],
    ['Go to Analytics', 'g then a'],
    ['Go to Simulation', 'g then s'],
    ['Go to Reports', 'g then r'],
    ['Go to Settings', 'g then t'],
  ]},
  { group: 'Editing', items: [
    ['Undo', '⌘/Ctrl + Z'],
    ['Redo', '⌘/Ctrl + Shift + Z   or   ⌘/Ctrl + Y'],
    ['Show this help', '?'],
  ]},
  { group: 'Cycle Builder', items: [
    ['Add step', 'Click + Add Step'],
    ['Reorder', 'Drag row → drop above / below another'],
    ['Merge parallel', 'Drag row → drop on middle of target row'],
    ['Duplicate', 'Click copy icon on a row'],
    ['Delete', 'Click trash icon, or bulk select'],
  ]},
];

export default function ShortcutsModal() {
  const open = useStore((s) => s.shortcutsOpen);
  const close = () => useStore.getState().setShortcutsOpen(false);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={close}
    >
      <div
        className="glass-strong max-w-[720px] w-[92vw] rounded-xl border border-violet/40 shadow-neon-violet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-violet">Help</div>
            <div className="text-lg font-semibold">Keyboard Shortcuts</div>
          </div>
          <button
            className="h-8 w-8 grid place-items-center rounded text-slate-400 hover:text-white hover:bg-white/10"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-6 p-5">
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                {g.group}
              </div>
              <ul className="space-y-1.5 text-sm">
                {g.items.map(([label, keys]) => (
                  <li key={label} className="flex items-center justify-between gap-3">
                    <span className="text-slate-200">{label}</span>
                    <span className="font-mono text-[11px] text-slate-400">{keys}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-white/10 text-[11px] text-slate-500">
          All actions also available via the Command Palette (<span className="kbd">⌘</span>{' '}
          <span className="kbd">K</span>).
        </div>
      </div>
    </div>
  );
}
