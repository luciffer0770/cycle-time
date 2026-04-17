import React from 'react';
import { useStore } from '../../store/useStore.js';

export default function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  const toneMap = {
    info: 'border-cyan/50 shadow-neon-cyan',
    success: 'border-optimal/50 shadow-neon-green',
    warning: 'border-warn/50',
    error: 'border-critical/60 shadow-neon-red',
  };
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={`glass-strong px-4 py-3 rounded-lg border ${toneMap[toast.tone] || toneMap.info}`}
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          {toast.tone || 'info'}
        </div>
        <div className="text-sm text-slate-100">{toast.message}</div>
      </div>
    </div>
  );
}
