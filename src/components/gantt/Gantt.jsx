import React, { useMemo, useState } from 'react';
import { computeSchedule } from '../../lib/engine.js';
import { classNames, fmtSec } from '../../lib/utils.js';

// Color semantics:
//   machine  → blue gradient
//   operator → cyan
//   setup    → violet
//   wait     → orange/red
//   critical → red glow
//   optimal  → green

export default function Gantt({
  steps,
  taktTime = 0,
  heatmap = false,
  compact = false,
  swimLane = false,
  highlightStepId = null,
  onStepClick,
}) {
  const schedule = useMemo(() => computeSchedule(steps), [steps]);
  const [hoverId, setHoverId] = useState(null);

  const total = Math.max(schedule.totalCycleTime, taktTime || 0, 1);
  const rowH = compact ? 22 : 32;
  const gap = compact ? 4 : 6;

  const ticks = useMemo(() => {
    const step = niceStep(total, 10);
    const arr = [];
    for (let v = 0; v <= total + 0.0001; v += step) arr.push(Number(v.toFixed(3)));
    return arr;
  }, [total]);

  if (!schedule.steps.length) {
    return (
      <div className="h-48 grid place-items-center text-slate-500 text-sm">
        No steps yet — add steps in the Cycle Builder.
      </div>
    );
  }

  const pct = (v) => (v / total) * 100;
  const critContrib = new Map(
    schedule.units.map((u) => [u.id, u.isCritical ? u.duration / (schedule.totalCycleTime || 1) : 0]),
  );
  const stepToUnit = new Map();
  schedule.units.forEach((u) => u.stepIds.forEach((id) => stepToUnit.set(id, u.id)));

  // If swim-lane mode: group steps by station, sort by start time within each.
  const lanes = useMemo(() => {
    if (!swimLane) return null;
    const byStation = new Map();
    schedule.steps.forEach((s) => {
      const key = s.stationId || 'Unassigned';
      if (!byStation.has(key)) byStation.set(key, []);
      byStation.get(key).push(s);
    });
    const list = Array.from(byStation.entries()).map(([station, arr]) => ({
      station,
      steps: arr.sort((a, b) => a.startTime - b.startTime),
    }));
    list.sort((a, b) => String(a.station).localeCompare(String(b.station)));
    return list;
  }, [schedule, swimLane]);

  return (
    <div className="w-full">
      {/* Timeline header */}
      <div className="relative h-7 border-b border-white/10 mb-2 pl-[220px]">
        <div className="relative h-full">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 bottom-0 text-[10px] font-mono text-slate-500 translate-x-[-50%]"
              style={{ left: `${pct(t)}%` }}
            >
              <div className="h-2 w-px bg-white/10 mx-auto" />
              <div className="mt-0.5">{t}s</div>
            </div>
          ))}
          {taktTime > 0 && (
            <div
              className="absolute top-0 bottom-0 text-[10px] font-mono text-critical"
              style={{ left: `${pct(taktTime)}%` }}
            >
              <div className="h-4 w-0.5 bg-critical shadow-neon-red" />
              <div className="-translate-x-1/2 mt-0.5 px-1 rounded bg-critical/20 border border-critical/40 whitespace-nowrap">
                TAKT {taktTime}s
              </div>
            </div>
          )}
        </div>
      </div>

      {swimLane ? (
        <div className="space-y-5">
          {lanes.map((lane) => (
            <div key={lane.station}>
              <div className="flex items-center gap-2 mb-1 pl-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">
                  Station
                </span>
                <span className="text-sm text-cyan font-mono">{lane.station}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({lane.steps.length} steps, load{' '}
                  {lane.steps.reduce((a, b) => a + b.cycleTime, 0).toFixed(1)}s)
                </span>
              </div>
              <Rows
                rows={lane.steps}
                pct={pct}
                ticks={ticks}
                taktTime={taktTime}
                total={total}
                rowH={rowH}
                gap={gap}
                heatmap={heatmap}
                stepToUnit={stepToUnit}
                critContrib={critContrib}
                hoverId={hoverId}
                setHoverId={setHoverId}
                highlightStepId={highlightStepId}
                onStepClick={onStepClick}
                schedule={schedule}
                numberedFrom={0}
              />
            </div>
          ))}
        </div>
      ) : (
        <Rows
          rows={schedule.steps}
          pct={pct}
          ticks={ticks}
          taktTime={taktTime}
          total={total}
          rowH={rowH}
          gap={gap}
          heatmap={heatmap}
          stepToUnit={stepToUnit}
          critContrib={critContrib}
          hoverId={hoverId}
          setHoverId={setHoverId}
          highlightStepId={highlightStepId}
          onStepClick={onStepClick}
          schedule={schedule}
        />
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
        <LegendSwatch tone="machine" label="Machine" />
        <LegendSwatch tone="cyan" label="Operator" />
        <LegendSwatch tone="violet" label="Setup" />
        <LegendSwatch tone="wait" label="Wait" />
        <LegendSwatch tone="critical" label="Bottleneck" />
        {taktTime > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-critical shadow-neon-red" />
            Takt line
          </div>
        )}
      </div>
    </div>
  );
}

function Rows({
  rows,
  pct,
  ticks,
  taktTime,
  rowH,
  gap,
  heatmap,
  stepToUnit,
  critContrib,
  hoverId,
  setHoverId,
  highlightStepId,
  onStepClick,
  schedule,
  numberedFrom,
}) {
  return (
    <div className="relative">
      <div className="absolute left-[220px] right-0 top-0 bottom-0 pointer-events-none">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px bg-white/5"
            style={{ left: `${pct(t)}%` }}
          />
        ))}
        {taktTime > 0 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-critical/50"
            style={{ left: `${pct(taktTime)}%` }}
          />
        )}
      </div>

      <div className="relative flex flex-col" style={{ gap }}>
        {rows.map((s, idx) => {
          const uid = stepToUnit.get(s.id);
          const isBn = schedule.bottleneck && uid === schedule.bottleneck.id;
          const highlighted = hoverId === s.id || highlightStepId === s.id;
          const severity = heatmap ? heatmapColor(s, schedule) : null;

          const mLeft = pct(s.startTime);
          const segBase = s.startTime;
          const mW = pct(Math.max(0, s.machineTime));
          const oW = pct(Math.max(0, s.operatorTime));
          const setupW = pct(Math.max(0, s.setupTime));
          const waitLeft = pct(segBase - s.waitTime);
          const waitW = pct(Math.max(0, s.waitTime));

          return (
            <div
              key={s.id}
              className={classNames(
                'group relative flex items-center gap-3 px-2 py-1 rounded-md transition',
                highlighted && 'bg-white/5',
              )}
              onMouseEnter={() => setHoverId(s.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => onStepClick?.(s)}
              style={{ cursor: onStepClick ? 'pointer' : 'default' }}
            >
              <div className="w-[212px] shrink-0 pr-2">
                <div className="flex items-center gap-2">
                  {numberedFrom === undefined && (
                    <span className="text-[10px] font-mono text-slate-500 w-6">{idx + 1}</span>
                  )}
                  <div className="truncate min-w-0">
                    <div
                      className={classNames(
                        'text-[13px] truncate',
                        s.isCritical ? 'text-slate-100 font-semibold' : 'text-slate-200',
                      )}
                      title={s.name}
                    >
                      {s.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex gap-2">
                      {s.stationId && <span>⬡ {s.stationId}</span>}
                      {s.groupId && <span>∥ {s.groupId}</span>}
                      {!s.isValueAdded && <span className="text-warn">NVA</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="relative flex-1 rounded-md"
                style={{ height: rowH, background: 'rgba(15,23,42,0.5)' }}
              >
                {waitW > 0 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
                    style={{
                      left: `${waitLeft}%`,
                      width: `${waitW}%`,
                      background:
                        'repeating-linear-gradient(45deg, rgba(245,158,11,0.75), rgba(245,158,11,0.75) 4px, rgba(225,29,46,0.7) 4px, rgba(225,29,46,0.7) 8px)',
                      boxShadow: '0 0 10px -2px rgba(245,158,11,0.5)',
                    }}
                    title={`Wait ${fmtSec(s.waitTime)}`}
                  />
                )}
                {mW > 0 && (
                  <Segment
                    left={mLeft}
                    width={mW}
                    tone={isBn ? 'critical' : 'machine'}
                    label={`M ${fmtSec(s.machineTime)}`}
                    glow={isBn || highlighted}
                    severity={severity}
                    height={rowH}
                  />
                )}
                {oW > 0 && (
                  <Segment
                    left={mLeft + mW}
                    width={oW}
                    tone={isBn ? 'critical' : 'cyan'}
                    label={`O ${fmtSec(s.operatorTime)}`}
                    glow={isBn || highlighted}
                    severity={severity}
                    height={rowH}
                  />
                )}
                {setupW > 0 && (
                  <Segment
                    left={mLeft + mW + oW}
                    width={setupW}
                    tone={isBn ? 'critical' : 'violet'}
                    label={`S ${fmtSec(s.setupTime)}`}
                    glow={isBn || highlighted}
                    severity={severity}
                    height={rowH}
                  />
                )}

                {(s.dependencies || []).length > 0 && (
                  <div
                    className="absolute w-1.5 h-1.5 rounded-full bg-cyan shadow-neon-cyan"
                    style={{
                      left: `calc(${mLeft}% - 4px)`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                )}

                {hoverId === s.id && (
                  <div
                    className="absolute z-10 -top-14 glass-strong px-3 py-2 rounded-md text-[11px] font-mono shadow-panel"
                    style={{
                      left: `min(${mLeft}%, calc(100% - 220px))`,
                      minWidth: 220,
                    }}
                  >
                    <div className="text-slate-200 font-semibold mb-1">{s.name}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-300">
                      <span>Start</span>
                      <span className="text-right">{s.startTime.toFixed(1)}s</span>
                      <span>End</span>
                      <span className="text-right">{s.endTime.toFixed(1)}s</span>
                      <span>Cycle</span>
                      <span className="text-right">{s.cycleTime.toFixed(1)}s</span>
                      <span>Wait</span>
                      <span className="text-right text-warn">{s.waitTime.toFixed(1)}s</span>
                      {s.isCritical && (
                        <>
                          <span className="text-critical">Critical</span>
                          <span className="text-right text-critical">
                            {((critContrib.get(uid) || 0) * 100).toFixed(1)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="w-20 shrink-0 text-right font-mono text-[11px] text-slate-400">
                {s.cycleTime.toFixed(1)}s
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Segment({ left, width, tone, label, glow, severity, height }) {
  const gradients = {
    machine: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
    cyan: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)',
    violet: 'linear-gradient(135deg, #6D28D9 0%, #A78BFA 100%)',
    critical: 'linear-gradient(135deg, #E11D2E 0%, #F43F5E 100%)',
    optimal: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
    wait: 'linear-gradient(135deg, #F59E0B 0%, #E11D2E 100%)',
  };
  const glows = {
    machine: '0 0 16px -4px rgba(30,64,175,0.7)',
    cyan: '0 0 16px -4px rgba(6,182,212,0.7)',
    violet: '0 0 16px -4px rgba(109,40,217,0.7)',
    critical: '0 0 22px -4px rgba(225,29,46,0.85)',
    optimal: '0 0 18px -4px rgba(34,197,94,0.7)',
    wait: '0 0 16px -4px rgba(245,158,11,0.7)',
  };
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 rounded-sm border border-white/10 transition-all"
      style={{
        left: `${left}%`,
        width: `${Math.max(0.3, width)}%`,
        height: Math.max(12, height - 10),
        background: severity || gradients[tone] || gradients.cyan,
        boxShadow: glow ? glows[tone] || glows.cyan : 'none',
      }}
      title={label}
    >
      <span className="absolute inset-0 px-1.5 text-[10px] font-mono text-white/90 leading-none flex items-center truncate">
        {width > 5 && label}
      </span>
    </div>
  );
}

function LegendSwatch({ tone, label }) {
  const m = {
    machine: 'from-[#1E40AF] to-[#3B82F6]',
    cyan: 'from-[#06B6D4] to-[#22D3EE]',
    violet: 'from-[#6D28D9] to-[#A78BFA]',
    critical: 'from-[#E11D2E] to-[#F43F5E]',
    optimal: 'from-[#16A34A] to-[#22C55E]',
    wait: 'from-[#F59E0B] to-[#E11D2E]',
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-5 rounded-sm bg-gradient-to-r ${m[tone]}`} />
      {label}
    </span>
  );
}

function heatmapColor(step, schedule) {
  const total = schedule.totalCycleTime || 1;
  const severity = Math.min(1, (step.cycleTime + step.waitTime) / (total / 3));
  const r = Math.round(30 + severity * 200);
  const g = Math.round(64 + (1 - Math.abs(severity - 0.5) * 2) * 150);
  const b = Math.round(175 * (1 - severity));
  return `linear-gradient(135deg, rgba(${r},${g},${b},0.85), rgba(${r},${g},${b},0.55))`;
}

function niceStep(total, approxCount = 10) {
  const raw = total / approxCount;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const norm = raw / pow;
  let nice;
  if (norm < 1.5) nice = 1;
  else if (norm < 3) nice = 2;
  else if (norm < 7) nice = 5;
  else nice = 10;
  return Math.max(1, nice * pow);
}
