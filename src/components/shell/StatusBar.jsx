import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { validateSteps } from '../../lib/analytics.js';

export default function StatusBar() {
  const project = useStore((s) => s.getActiveProject());
  const settings = useStore((s) => s.settings);
  const toastHistory = useStore((s) => s.toastHistory);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const issues = validateSteps(project?.steps || []);
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;

  return (
    <footer className="h-7 px-4 flex items-center gap-4 text-[10px] font-mono text-slate-500 border-t border-white/5 bg-black/40">
      <span>CTA v1.1</span>
      <span>•</span>
      <span>
        Steps <span className="text-slate-300">{project?.steps?.length || 0}</span>
      </span>
      <span>•</span>
      <span>
        Stations{' '}
        <span className="text-slate-300">
          {new Set((project?.steps || []).map((s) => s.stationId).filter(Boolean)).size || '–'}
        </span>
      </span>
      <span>•</span>
      <span>
        Groups{' '}
        <span className="text-slate-300">
          {new Set((project?.steps || []).map((s) => s.groupId).filter(Boolean)).size || '–'}
        </span>
      </span>
      <span>•</span>
      {errors > 0 ? (
        <span className="text-critical">✕ {errors} error{errors > 1 ? 's' : ''}</span>
      ) : (
        <span className="text-optimal">✓ 0 errors</span>
      )}
      {warnings > 0 && (
        <>
          <span>•</span>
          <span className="text-warn">⚠ {warnings} warning{warnings > 1 ? 's' : ''}</span>
        </>
      )}
      <span className="ml-auto flex items-center gap-3">
        {settings.autoSave && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-optimal shadow-neon-green animate-pulse-soft" />
            Auto-saving
          </span>
        )}
        <span>{toastHistory.length} events</span>
        <span>{now.toLocaleString()}</span>
      </span>
    </footer>
  );
}
