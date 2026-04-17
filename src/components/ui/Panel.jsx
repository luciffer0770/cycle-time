import React from 'react';
import { classNames } from '../../lib/utils.js';

export function Panel({ title, subtitle, right, className, children, tone }) {
  const toneRing = {
    cyan: 'before:bg-gradient-to-b before:from-cyan/60 before:to-violet/40',
    violet: 'before:bg-gradient-to-b before:from-violet/60 before:to-machine/40',
    red: 'before:bg-gradient-to-b before:from-critical/70 before:to-violet/30',
    green: 'before:bg-gradient-to-b before:from-optimal/70 before:to-cyan/30',
  }[tone] || 'before:bg-gradient-to-b before:from-cyan/30 before:to-violet/20';

  return (
    <section
      className={classNames(
        'relative glass p-5',
        'before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full',
        toneRing,
        className,
      )}
    >
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 mb-3">
          <div className="pl-3">
            {title && (
              <h2 className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">
                {title}
              </h2>
            )}
            {subtitle && <div className="text-sm text-slate-200 mt-1">{subtitle}</div>}
          </div>
          {right && <div className="flex items-center gap-2">{right}</div>}
        </header>
      )}
      <div className="pl-3">{children}</div>
    </section>
  );
}

export default Panel;
