import React, { useMemo, useState } from 'react';
import Panel from '../components/ui/Panel.jsx';
import Gantt from '../components/gantt/Gantt.jsx';
import DependencyGraph from '../components/charts/DependencyGraph.jsx';
import { useStore } from '../store/useStore.js';
import { computeSchedule } from '../lib/engine.js';
import { bottleneckContributions } from '../lib/analytics.js';
import { fmtSec } from '../lib/utils.js';
import { IconTarget, IconGantt, IconLayers, IconLink } from '../components/ui/Icons.jsx';

export default function GanttPage() {
  const project = useStore((s) => s.getActiveProject());
  const [heatmap, setHeatmap] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [highlightId, setHighlightId] = useState(null);
  const [view, setView] = useState('gantt'); // 'gantt' | 'swim' | 'dag'

  const schedule = useMemo(() => computeSchedule(project.steps), [project.steps]);
  const contrib = bottleneckContributions(schedule);

  return (
    <div className="space-y-4">
      <Panel
        title="Blueprint"
        subtitle={`Cycle ${fmtSec(schedule.totalCycleTime)} · ${project.steps.length} steps · Takt ${project.taktTime}s`}
        tone="cyan"
        right={
          <div className="flex items-center gap-3">
            <Tabs
              value={view}
              onChange={setView}
              tabs={[
                { id: 'gantt', label: 'Gantt', Icon: IconGantt },
                { id: 'swim', label: 'Swim-lane', Icon: IconLayers },
                { id: 'dag', label: 'DAG', Icon: IconLink },
              ]}
            />
            {view !== 'dag' && (
              <>
                <label className="flex items-center gap-2 text-[12px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={heatmap}
                    onChange={(e) => setHeatmap(e.target.checked)}
                    className="h-3.5 w-3.5 accent-cyan"
                  />
                  Heatmap
                </label>
                <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400">Zoom</span>
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="neon-range w-28"
                  />
                  <span className="font-mono text-[11px] text-slate-300 w-10 text-right">
                    {zoom.toFixed(1)}x
                  </span>
                </div>
              </>
            )}
          </div>
        }
      >
        {view === 'gantt' && (
          <div style={{ width: `${100 * zoom}%`, minWidth: '100%' }} className="overflow-x-auto">
            <Gantt
              steps={project.steps}
              taktTime={project.taktTime}
              heatmap={heatmap}
              highlightStepId={highlightId}
              onStepClick={(s) => setHighlightId((id) => (id === s.id ? null : s.id))}
            />
          </div>
        )}
        {view === 'swim' && (
          <div style={{ width: `${100 * zoom}%`, minWidth: '100%' }} className="overflow-x-auto">
            <Gantt
              steps={project.steps}
              taktTime={project.taktTime}
              heatmap={heatmap}
              swimLane
              highlightStepId={highlightId}
              onStepClick={(s) => setHighlightId((id) => (id === s.id ? null : s.id))}
            />
          </div>
        )}
        {view === 'dag' && (
          <DependencyGraph
            steps={project.steps}
            highlightId={highlightId}
            onSelect={(id) => setHighlightId((x) => (x === id ? null : id))}
          />
        )}
      </Panel>

      <div className="grid grid-cols-12 gap-4">
        <Panel
          className="col-span-7"
          title="Critical Path Breakdown"
          tone="red"
          right={
            <span className="chip border border-critical/50 bg-critical/10 text-critical">
              <IconTarget className="w-3 h-3" /> {schedule.criticalPath.length} units
            </span>
          }
        >
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {contrib.length === 0 && (
              <div className="py-6 text-center text-slate-500">Add steps to see critical path.</div>
            )}
            {contrib.map((c, i) => {
              const names = c.stepIds
                .map((sid) => schedule.steps.find((x) => x.id === sid)?.name)
                .filter(Boolean);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 hover:border-critical/40 transition cursor-pointer"
                  onClick={() => setHighlightId(c.stepIds[0])}
                >
                  <span className="font-mono text-[11px] text-slate-500 w-6">#{i + 1}</span>
                  <span className="chip border border-critical/40 bg-critical/10 text-critical font-mono">
                    {c.kind.toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm text-slate-100 truncate">
                    {names.join(' + ')}
                  </span>
                  <span className="font-mono text-[12px] text-slate-300">
                    {c.duration.toFixed(1)}s
                  </span>
                  <div className="w-24 h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${c.pct}%`,
                        background: 'linear-gradient(90deg,#E11D2E,#6D28D9)',
                      }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-critical w-14 text-right">
                    {c.pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="col-span-5" title="Schedule Table" tone="cyan">
          <div className="max-h-[420px] overflow-auto rounded-md border border-white/10">
            <table className="w-full text-[12px]">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500 bg-black/40 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Step</th>
                  <th className="text-right px-2 py-2">Start</th>
                  <th className="text-right px-2 py-2">End</th>
                  <th className="text-right px-2 py-2">Cycle</th>
                  <th className="text-right px-2 py-2">Wait</th>
                </tr>
              </thead>
              <tbody>
                {schedule.steps.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setHighlightId(s.id)}
                    className={
                      (s.isCritical ? 'text-slate-100 ' : 'text-slate-300 ') +
                      'hover:bg-white/5 cursor-pointer border-t border-white/5 ' +
                      (highlightId === s.id ? 'bg-cyan/5' : '')
                    }
                  >
                    <td className="px-3 py-1.5 truncate max-w-[200px]">
                      {s.isCritical && <span className="text-critical mr-1">●</span>}
                      {s.name}
                    </td>
                    <td className="text-right px-2 py-1.5 font-mono">{s.startTime.toFixed(1)}</td>
                    <td className="text-right px-2 py-1.5 font-mono">{s.endTime.toFixed(1)}</td>
                    <td className="text-right px-2 py-1.5 font-mono">{s.cycleTime.toFixed(1)}</td>
                    <td className="text-right px-2 py-1.5 font-mono text-warn">
                      {s.waitTime.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Tabs({ value, onChange, tabs }) {
  return (
    <div className="inline-flex items-center rounded-md border border-white/10 bg-black/30 p-0.5">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] transition ' +
              (active
                ? 'bg-cyan/15 text-cyan shadow-neon-cyan'
                : 'text-slate-300 hover:text-white')
            }
          >
            <t.Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
