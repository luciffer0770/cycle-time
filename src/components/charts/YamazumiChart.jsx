import React from 'react';

// Stacked vertical bars: one per station. Each segment = one step.
// Takt line overlay. Color by VA/NVA and highlight bottleneck step.

export default function YamazumiChart({ lanes, taktTime = 0, maxLoad }) {
  const chartMax = Math.max(
    ...(lanes || []).map((l) => l.total),
    taktTime || 0,
    1,
  );
  const H = 260; // px

  if (!lanes || lanes.length === 0) {
    return (
      <div className="h-48 grid place-items-center text-slate-500 text-sm">
        No stations assigned yet — set a Station on each step in Cycle Builder.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative" style={{ height: H + 38 }}>
        {/* Y axis ticks */}
        <div className="absolute left-0 top-0 w-10 h-full text-[10px] font-mono text-slate-500">
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <div
              key={r}
              className="absolute right-2 -translate-y-1/2"
              style={{ top: H - r * H }}
            >
              {(r * chartMax).toFixed(0)}s
            </div>
          ))}
        </div>

        {/* Plot area */}
        <div className="absolute left-10 right-0 top-0" style={{ height: H }}>
          {/* gridlines */}
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <div
              key={r}
              className="absolute left-0 right-0 border-t border-white/5"
              style={{ top: H - r * H }}
            />
          ))}
          {/* Takt line */}
          {taktTime > 0 && (
            <div
              className="absolute left-0 right-0 border-t border-critical/70"
              style={{ top: H - (taktTime / chartMax) * H }}
            >
              <span className="absolute -top-4 right-1 text-[10px] font-mono text-critical bg-critical/10 border border-critical/30 px-1 rounded">
                TAKT {taktTime}s
              </span>
            </div>
          )}
          {/* Max load reference */}
          {maxLoad > 0 && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-white/15"
              style={{ top: H - (maxLoad / chartMax) * H }}
            >
              <span className="absolute -top-4 left-1 text-[10px] font-mono text-slate-500">
                max {maxLoad.toFixed(1)}s
              </span>
            </div>
          )}
          {/* Bars */}
          <div className="absolute inset-0 flex items-end justify-around px-4 gap-2">
            {lanes.map((lane) => {
              const barWidth = `calc((100% - ${(lanes.length - 1) * 8}px) / ${lanes.length})`;
              return (
                <div
                  key={lane.stationId}
                  className="relative h-full flex items-end justify-center"
                  style={{ width: barWidth, maxWidth: 120 }}
                >
                  <div
                    className="relative w-full max-w-[80px] mx-auto"
                    style={{ height: (lane.total / chartMax) * H }}
                  >
                    {lane.segments.map((seg, i) => {
                      const h = (seg.duration / chartMax) * H;
                      const bottom = (seg.start / chartMax) * H;
                      return (
                        <div
                          key={seg.stepId}
                          className="absolute left-0 right-0 group"
                          style={{ bottom, height: Math.max(1, h) }}
                          title={`${seg.name} — ${seg.duration.toFixed(1)}s`}
                        >
                          <div
                            className="h-full border-t border-white/20 transition-all"
                            style={{
                              background: seg.isCritical
                                ? 'linear-gradient(135deg,#E11D2E,#F43F5E)'
                                : seg.isValueAdded
                                ? 'linear-gradient(135deg,#06B6D4,#1E40AF)'
                                : 'linear-gradient(135deg,#F59E0B,#B45309)',
                              boxShadow: seg.isCritical
                                ? '0 0 14px -4px rgba(225,29,46,0.6)'
                                : 'none',
                            }}
                          />
                          {h > 14 && (
                            <span className="absolute inset-0 px-1 flex items-center justify-center text-[9px] font-mono text-white/90 truncate">
                              {seg.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X axis labels */}
        <div className="absolute left-10 right-0 bottom-0 flex justify-around px-4 gap-2">
          {lanes.map((l) => (
            <div
              key={l.stationId}
              className="flex-1 max-w-[120px] text-center"
            >
              <div className="text-[11px] font-mono text-cyan">{l.stationId}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                {l.total.toFixed(1)}s
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
        <Swatch grad="from-[#06B6D4] to-[#1E40AF]" label="Value-added" />
        <Swatch grad="from-[#F59E0B] to-[#B45309]" label="Non-value-added" />
        <Swatch grad="from-[#E11D2E] to-[#F43F5E]" label="Critical path" />
        {taktTime > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 bg-critical" /> Takt
          </span>
        )}
      </div>
    </div>
  );
}

function Swatch({ grad, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-5 rounded-sm bg-gradient-to-r ${grad}`} />
      {label}
    </span>
  );
}
