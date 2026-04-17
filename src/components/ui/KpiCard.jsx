import React from 'react';
import { classNames } from '../../lib/utils.js';

const TONE = {
  blue: {
    grad: 'from-machine/40 via-machine/10 to-transparent',
    ring: 'border-machine/40 shadow-neon-blue',
    accent: 'text-machine',
  },
  cyan: {
    grad: 'from-cyan/40 via-cyan/10 to-transparent',
    ring: 'border-cyan/50 shadow-neon-cyan',
    accent: 'text-cyan',
  },
  green: {
    grad: 'from-optimal/40 via-optimal/10 to-transparent',
    ring: 'border-optimal/50 shadow-neon-green',
    accent: 'text-optimal',
  },
  red: {
    grad: 'from-critical/50 via-critical/10 to-transparent',
    ring: 'border-critical/60 shadow-neon-red',
    accent: 'text-critical',
  },
  violet: {
    grad: 'from-violet/50 via-violet/10 to-transparent',
    ring: 'border-violet/50 shadow-neon-violet',
    accent: 'text-violet',
  },
};

export default function KpiCard({
  label,
  value,
  sub,
  tone = 'cyan',
  Icon,
  pulse = false,
  delta,
  footer,
}) {
  const t = TONE[tone] || TONE.cyan;
  return (
    <div
      className={classNames(
        'relative overflow-hidden rounded-xl p-4 border backdrop-blur-xl',
        'bg-gradient-to-br',
        t.grad,
        t.ring,
        pulse && 'animate-pulse-soft',
      )}
    >
      <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-slate-300/90 font-semibold">
            {label}
          </div>
          <div className={classNames('mt-3 text-3xl font-semibold font-mono', t.accent)}>
            {value}
          </div>
          {sub && <div className="mt-1 text-xs text-slate-300">{sub}</div>}
        </div>
        {Icon && (
          <div
            className={classNames(
              'h-10 w-10 rounded-lg grid place-items-center bg-black/30 border border-white/10',
              t.accent,
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {delta !== undefined && (
        <div
          className={classNames(
            'mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-md border',
            delta >= 0
              ? 'text-optimal border-optimal/40 bg-optimal/10'
              : 'text-critical border-critical/40 bg-critical/10',
          )}
        >
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
        </div>
      )}
      {footer && <div className="relative mt-3 text-[11px] text-slate-400">{footer}</div>}
    </div>
  );
}
