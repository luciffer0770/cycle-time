import React, { useMemo } from 'react';
import Panel from '../components/ui/Panel.jsx';
import Gantt from '../components/gantt/Gantt.jsx';
import { useStore } from '../store/useStore.js';
import { computeSchedule, efficiency } from '../lib/engine.js';
import { vaVsNva, simulateRemoveStep } from '../lib/analytics.js';
import { fmtPct, classNames } from '../lib/utils.js';
import {
  IconRefresh,
  IconTrash,
  IconCheck,
  IconBeaker,
} from '../components/ui/Icons.jsx';

export default function SimulationPage() {
  const project = useStore((s) => s.getActiveProject());
  const copyToSim = useStore((s) => s.copyToSimulation);
  const updateSim = useStore((s) => s.updateSimStep);
  const setSim = useStore((s) => s.setSimulationSteps);
  const applySim = useStore((s) => s.applySimulation);
  const notify = useStore((s) => s.notify);

  const before = useMemo(() => computeSchedule(project.steps), [project.steps]);
  const after = useMemo(
    () => computeSchedule(project.simulationSteps),
    [project.simulationSteps],
  );

  const beforeVA = vaVsNva(project.steps);
  const afterVA = vaVsNva(project.simulationSteps);

  const delta = after.totalCycleTime - before.totalCycleTime;
  const bnShift =
    (before.bottleneck?.stepNames?.join(' + ') || '—') !==
    (after.bottleneck?.stepNames?.join(' + ') || '—');

  const removeSim = (id) => {
    const { remaining } = simulateRemoveStep(project.simulationSteps, id);
    setSim(remaining);
    notify('Removed from simulation — recalculating…', 'info');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <Panel
          className="col-span-3"
          title="Scenario"
          tone="violet"
          subtitle="What-if analysis"
          right={
            <span className="chip border border-violet/40 bg-violet/10 text-violet">
              <IconBeaker className="w-3 h-3" /> SIM
            </span>
          }
        >
          <div className="space-y-2">
            <button className="btn-primary w-full" onClick={copyToSim}>
              <IconRefresh className="w-3.5 h-3.5" /> Reset from Current
            </button>
            <button className="btn-ghost w-full" onClick={() => setSim([])}>
              <IconTrash className="w-3.5 h-3.5" /> Clear All Steps
            </button>
            <button
              className="btn-ghost w-full"
              onClick={() => {
                applySim();
                notify('Simulation applied to live project', 'success');
              }}
            >
              <IconCheck className="w-3.5 h-3.5" /> Apply to Project
            </button>
          </div>

          <div className="divider my-4" />

          <div className="space-y-2">
            <ComparisonStat
              label="Cycle Time"
              before={`${before.totalCycleTime.toFixed(1)}s`}
              after={`${after.totalCycleTime.toFixed(1)}s`}
              delta={delta}
              units="s"
            />
            <ComparisonStat
              label="Efficiency"
              before={fmtPct(efficiency(before) * 100, 1)}
              after={fmtPct(efficiency(after) * 100, 1)}
              delta={(efficiency(after) - efficiency(before)) * 100}
              units="pp"
              positiveIsGood
            />
            <ComparisonStat
              label="Value Added"
              before={`${beforeVA.va.toFixed(1)}s`}
              after={`${afterVA.va.toFixed(1)}s`}
              delta={afterVA.va - beforeVA.va}
              units="s"
              positiveIsGood
            />
            <ComparisonStat
              label="Wait Time"
              before={`${before.steps.reduce((a, b) => a + b.waitTime, 0).toFixed(1)}s`}
              after={`${after.steps.reduce((a, b) => a + b.waitTime, 0).toFixed(1)}s`}
              delta={
                after.steps.reduce((a, b) => a + b.waitTime, 0) -
                before.steps.reduce((a, b) => a + b.waitTime, 0)
              }
              units="s"
            />
          </div>

          <div className="divider my-4" />

          <div className="rounded-md border border-white/10 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              Bottleneck
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
              <span className="text-slate-400">BEFORE</span>
              <span className="text-critical truncate">
                {before.bottleneck?.stepNames?.[0] || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">AFTER</span>
              <span
                className={classNames(
                  'truncate',
                  bnShift ? 'text-optimal' : 'text-critical',
                )}
              >
                {after.bottleneck?.stepNames?.[0] || '—'}
              </span>
            </div>
            {bnShift && (
              <div className="mt-2 text-[11px] text-optimal">
                ✓ Bottleneck shifted — re-evaluate other constraints.
              </div>
            )}
          </div>
        </Panel>

        <Panel className="col-span-9" title="Simulation Steps · Live Sliders" tone="cyan">
          <div className="space-y-3 max-h-[520px] overflow-auto pr-2">
            {project.simulationSteps.length === 0 && (
              <div className="py-10 text-center text-slate-500">
                No simulation steps. Click "Reset from Current" to start.
              </div>
            )}
            {project.simulationSteps.map((s) => {
              const ss = after.steps.find((x) => x.id === s.id) || s;
              const isBn = after.bottleneck?.stepIds?.includes(s.id);
              const maxM = Math.max(120, (s.machineTime || 0) * 2);
              const maxO = Math.max(60, (s.operatorTime || 0) * 2);
              return (
                <div
                  key={s.id}
                  className={classNames(
                    'rounded-md border px-3 py-2',
                    isBn
                      ? 'border-critical/40 bg-critical/5 shadow-neon-red'
                      : 'border-white/10 bg-black/30',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={classNames(
                          'h-2 w-2 rounded-full',
                          isBn ? 'bg-critical' : ss.isCritical ? 'bg-cyan' : 'bg-slate-500',
                        )}
                      />
                      <input
                        value={s.name}
                        onChange={(e) => updateSim(s.id, { name: e.target.value })}
                        className="bg-transparent outline-none text-sm text-slate-100 truncate min-w-0 focus:text-cyan"
                      />
                      {isBn && (
                        <span className="chip border border-critical/40 bg-critical/10 text-critical">
                          BOTTLENECK
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="text-slate-400">
                        CT <b className="text-slate-100">{ss.cycleTime.toFixed(1)}s</b>
                      </span>
                      <span className="text-slate-400">
                        WAIT <b className="text-warn">{ss.waitTime.toFixed(1)}s</b>
                      </span>
                      <button
                        onClick={() => removeSim(s.id)}
                        className="h-6 w-6 grid place-items-center rounded text-slate-400 hover:text-critical hover:bg-critical/10"
                        title="Remove in simulation"
                      >
                        <IconTrash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <SliderField
                      label="Machine"
                      value={s.machineTime}
                      max={maxM}
                      onChange={(v) => updateSim(s.id, { machineTime: v })}
                    />
                    <SliderField
                      label="Operator"
                      value={s.operatorTime}
                      max={maxO}
                      onChange={(v) => updateSim(s.id, { operatorTime: v })}
                    />
                    <SliderField
                      label="Setup"
                      value={s.setupTime}
                      max={Math.max(30, (s.setupTime || 0) * 2)}
                      onChange={(v) => updateSim(s.id, { setupTime: v })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Panel className="col-span-6" title="Before" tone="red" subtitle="Baseline schedule">
          <Gantt steps={project.steps} taktTime={project.taktTime} compact />
        </Panel>
        <Panel className="col-span-6" title="After" tone="green" subtitle="Simulated schedule">
          <Gantt steps={project.simulationSteps} taktTime={project.taktTime} compact />
        </Panel>
      </div>
    </div>
  );
}

function SliderField({ label, value, max, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-slate-400">{label}</span>
        <input
          type="number"
          value={Number(value || 0).toFixed(1)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="bg-transparent text-right font-mono text-sm outline-none w-16 text-slate-100 focus:text-cyan"
        />
      </div>
      <input
        type="range"
        className="neon-range mt-1"
        min={0}
        max={max}
        step={0.5}
        value={value || 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ComparisonStat({ label, before, after, delta, units, positiveIsGood = false }) {
  const good = positiveIsGood ? delta >= 0 : delta <= 0;
  return (
    <div className="rounded-md border border-white/10 bg-black/30 p-2.5">
      <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">{label}</div>
      <div className="flex items-center justify-between text-[12px] font-mono">
        <span className="text-slate-300">{before}</span>
        <span className="text-slate-500">→</span>
        <span className="text-slate-100">{after}</span>
      </div>
      <div
        className={classNames(
          'mt-1 text-[11px] font-mono',
          good ? 'text-optimal' : 'text-critical',
        )}
      >
        {delta >= 0 ? '+' : ''}
        {Number(delta).toFixed(2)}
        {units}
      </div>
    </div>
  );
}
