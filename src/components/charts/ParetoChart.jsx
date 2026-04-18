import React from 'react';

// Classic Pareto: sorted bars + cumulative line.
// Expects data items: { name, value, pct, cumulativePct }.

export default function ParetoChart({ data, height = 240, taktTime = 0 }) {
  if (!data || data.length === 0)
    return (
      <div className="h-40 grid place-items-center text-slate-500 text-sm">
        Add steps to see the Pareto distribution.
      </div>
    );
  const maxV = Math.max(...data.map((d) => d.value));
  const H = height;
  const barArea = H - 26;
  const labelEvery = Math.max(1, Math.floor(data.length / 10));

  return (
    <div className="w-full">
      <div className="relative" style={{ height: H + 40 }}>
        {/* gridlines */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <div
            key={r}
            className="absolute left-10 right-10 border-t border-white/5"
            style={{ top: barArea - r * barArea + 4 }}
          />
        ))}
        {/* 80% marker */}
        <div
          className="absolute left-10 right-10 border-t border-dashed border-warn/70 text-[10px] font-mono text-warn"
          style={{ top: barArea - 0.8 * barArea + 4 }}
        >
          <span className="absolute -top-4 right-1 bg-warn/10 border border-warn/30 rounded px-1">
            80%
          </span>
        </div>

        {/* Left axis (value) */}
        <div className="absolute left-0 top-0 w-10" style={{ height: barArea + 8 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <div
              key={r}
              className="absolute right-2 -translate-y-1/2 text-[10px] font-mono text-slate-500"
              style={{ top: barArea - r * barArea + 4 }}
            >
              {(r * maxV).toFixed(0)}s
            </div>
          ))}
        </div>
        {/* Right axis (%) */}
        <div className="absolute right-0 top-0 w-10" style={{ height: barArea + 8 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <div
              key={r}
              className="absolute left-2 -translate-y-1/2 text-[10px] font-mono text-slate-500"
              style={{ top: barArea - r * barArea + 4 }}
            >
              {(r * 100).toFixed(0)}%
            </div>
          ))}
        </div>

        {/* Bars */}
        <div
          className="absolute left-10 right-10 top-0 flex items-end gap-1"
          style={{ height: barArea + 8 }}
        >
          {data.map((d, i) => {
            const h = (d.value / maxV) * barArea;
            return (
              <div
                key={d.id || i}
                className="relative flex-1 group"
                style={{ height: barArea }}
                title={`${d.name} — ${d.value.toFixed(1)}s (${d.pct.toFixed(1)}%)`}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-sm border border-white/10 transition-all group-hover:brightness-125"
                  style={{
                    height: h,
                    background:
                      d.cumulativePct <= 80
                        ? 'linear-gradient(180deg,#E11D2E,#6D28D9)'
                        : 'linear-gradient(180deg,#1E40AF,#06B6D4)',
                    boxShadow:
                      d.cumulativePct <= 80
                        ? '0 0 12px -4px rgba(225,29,46,0.6)'
                        : 'none',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Cumulative line (SVG overlay) */}
        <svg
          className="absolute left-10 right-10 top-0 pointer-events-none"
          style={{ height: barArea + 8 }}
          width="100%"
        >
          <defs>
            <linearGradient id="cum-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#cum-grad)"
            strokeWidth="2"
            points={data
              .map((d, i) => {
                const x = ((i + 0.5) / data.length) * 100;
                const y = barArea - (d.cumulativePct / 100) * barArea + 4;
                return `${x}%,${y}`;
              })
              .join(' ')}
            vectorEffect="non-scaling-stroke"
            style={{ filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' }}
          />
          {data.map((d, i) => {
            const x = ((i + 0.5) / data.length) * 100;
            const y = barArea - (d.cumulativePct / 100) * barArea + 4;
            return (
              <circle key={i} cx={`${x}%`} cy={y} r="2" fill="#22C55E" />
            );
          })}
        </svg>

        {/* X labels (sparse) */}
        <div
          className="absolute left-10 right-10 flex gap-1"
          style={{ top: barArea + 10 }}
        >
          {data.map((d, i) => (
            <div
              key={d.id || i}
              className="flex-1 text-center text-[10px] font-mono text-slate-500 truncate"
              title={d.name}
            >
              {i % labelEvery === 0 ? d.name : ''}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-sm bg-gradient-to-b from-critical to-violet" />
          Vital few (≤80% cumulative)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-sm bg-gradient-to-b from-machine to-cyan" />
          Trivial many
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-gradient-to-r from-optimal to-cyan" />
          Cumulative %
        </span>
      </div>
    </div>
  );
}
