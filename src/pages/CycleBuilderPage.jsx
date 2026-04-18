import React, { useMemo, useRef, useState } from 'react';
import Panel from '../components/ui/Panel.jsx';
import { useStore } from '../store/useStore.js';
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconUpload,
  IconDownload,
  IconGrip,
  IconLink,
  IconSparkles,
  IconCheck,
  IconSave,
} from '../components/ui/Icons.jsx';
import { classNames } from '../lib/utils.js';
import { computeSchedule } from '../lib/engine.js';
import { validateSteps, suggestNextSteps, MUDA_TYPES } from '../lib/analytics.js';
import { importStepsFromFile, exportStepsToXlsx, exportTemplateXlsx } from '../lib/excel.js';
import { downloadProjectJson, readProjectJsonFile } from '../lib/project-io.js';
import { TEMPLATES } from '../lib/templates.js';

export default function CycleBuilderPage() {
  const project = useStore((s) => s.getActiveProject());
  const addStep = useStore((s) => s.addStep);
  const insertStepAfter = useStore((s) => s.insertStepAfter);
  const updateStep = useStore((s) => s.updateStep);
  const removeStep = useStore((s) => s.removeStep);
  const removeSteps = useStore((s) => s.removeSteps);
  const duplicateStep = useStore((s) => s.duplicateStep);
  const reorderSteps = useStore((s) => s.reorderSteps);
  const setSteps = useStore((s) => s.setSteps);
  const setGroupBulk = useStore((s) => s.setGroup);
  const setStationBulk = useStore((s) => s.setStation);
  const notify = useStore((s) => s.notify);
  const loadTemplate = useStore((s) => s.loadTemplateIntoActive);
  const captureBaseline = useStore((s) => s.captureBaseline);
  const saveVersion = useStore((s) => s.saveVersion);
  const createProject = useStore((s) => s.createProject);

  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelectedMulti] = useState(new Set());
  const [filter, setFilter] = useState('');
  const [dragId, setDragId] = useState(null);
  const fileRef = useRef(null);
  const jsonRef = useRef(null);

  const schedule = useMemo(() => computeSchedule(project.steps), [project.steps]);
  const issues = useMemo(() => validateSteps(project.steps), [project.steps]);

  const byId = new Map(project.steps.map((s) => [s.id, s]));
  const current = selectedId ? byId.get(selectedId) : null;

  const filtered = project.steps.filter((s) =>
    filter
      ? (s.name + ' ' + (s.stationId || '') + ' ' + (s.groupId || ''))
          .toLowerCase()
          .includes(filter.toLowerCase())
      : true,
  );

  const stations = useMemo(
    () => Array.from(new Set(project.steps.map((s) => s.stationId).filter(Boolean))).sort(),
    [project.steps],
  );
  const groups = useMemo(
    () => Array.from(new Set(project.steps.map((s) => s.groupId).filter(Boolean))).sort(),
    [project.steps],
  );

  // Drag handlers --------------------------------------------------------------
  const onDragStart = (id) => setDragId(id);
  const onDrop = (targetId, position) => {
    if (!dragId || dragId === targetId) return setDragId(null);
    const order = project.steps.map((s) => s.id).filter((x) => x !== dragId);
    const tIdx = order.indexOf(targetId);
    if (tIdx < 0) return setDragId(null);
    const insertAt = position === 'before' ? tIdx : tIdx + 1;
    order.splice(insertAt, 0, dragId);
    reorderSteps(order);
    setDragId(null);
  };
  const onDropIntoGroup = (targetId) => {
    if (!dragId || dragId === targetId) return setDragId(null);
    const t = byId.get(targetId);
    if (!t) return;
    const groupId = t.groupId || `G-${targetId.slice(-4)}`;
    updateStep(t.id, { groupId });
    updateStep(dragId, { groupId, dependencies: t.dependencies || [] });
    notify(`Merged into parallel group ${groupId}`, 'success');
    setDragId(null);
  };

  // Bulk-select toggles --------------------------------------------------------
  const toggleSelected = (id, e) => {
    setSelectedMulti((prev) => {
      const next = new Set(prev);
      if (e?.shiftKey && next.size > 0) {
        // range select
        const ids = filtered.map((s) => s.id);
        const last = [...next].pop();
        const a = ids.indexOf(last);
        const b = ids.indexOf(id);
        if (a >= 0 && b >= 0) {
          const [s, e2] = a < b ? [a, b] : [b, a];
          for (let i = s; i <= e2; i++) next.add(ids[i]);
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelected = () => setSelectedMulti(new Set());

  // File I/O -------------------------------------------------------------------
  const handleImportXlsx = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const steps = await importStepsFromFile(file);
      setSteps(steps);
      notify(`Imported ${steps.length} steps`, 'success');
    } catch (err) {
      notify('Failed to import: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  };
  const handleImportJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const p = await readProjectJsonFile(file);
      createProject('cnc-machining', p.name);
      const st = useStore.getState();
      st.patchActiveProject(() => ({ ...p }));
      notify(`Imported project “${p.name}”`, 'success');
    } catch (err) {
      notify('Failed to import JSON: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      <Panel
        className="col-span-8"
        title="Process Steps"
        subtitle={`${project.steps.length} steps · total ${schedule.totalCycleTime.toFixed(1)}s${
          filter ? ` · filter "${filter}"` : ''
        }`}
        tone="cyan"
        right={
          <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter steps…"
              className="input-industrial w-48"
            />
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              ref={fileRef}
              onChange={handleImportXlsx}
              className="hidden"
            />
            <input
              type="file"
              accept="application/json"
              ref={jsonRef}
              onChange={handleImportJson}
              className="hidden"
            />
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
              <IconUpload className="w-3.5 h-3.5" /> Excel
            </button>
            <button className="btn-ghost" onClick={() => jsonRef.current?.click()}>
              <IconUpload className="w-3.5 h-3.5" /> JSON
            </button>
            <button className="btn-ghost" onClick={() => exportStepsToXlsx(project)}>
              <IconDownload className="w-3.5 h-3.5" /> Export
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                const s = addStep({ name: `Step ${project.steps.length + 1}`, machineTime: 5 });
                setSelectedId(s.id);
              }}
            >
              <IconPlus className="w-3.5 h-3.5" /> Add Step
            </button>
          </div>
        }
      >
        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mb-3 rounded-md border border-cyan/40 bg-cyan/10 shadow-neon-cyan flex items-center gap-2 px-3 py-2">
            <span className="text-[11px] uppercase tracking-widest text-cyan">
              {selected.size} selected
            </span>
            <Divider />
            <BulkSetStation stations={stations} onPick={(v) => { setStationBulk([...selected], v); notify('Stations updated', 'info'); }} />
            <BulkSetGroup groups={groups} onPick={(v) => { setGroupBulk([...selected], v); notify('Groups updated', 'info'); }} />
            <button
              className="btn-ghost"
              onClick={() => {
                removeSteps([...selected]);
                clearSelected();
                notify(`Removed ${selected.size} steps`, 'warning');
              }}
            >
              <IconTrash className="w-3.5 h-3.5" /> Delete
            </button>
            <button className="ml-auto text-[11px] text-slate-400 hover:text-white" onClick={clearSelected}>
              Clear
            </button>
          </div>
        )}

        <div className="rounded-md border border-white/10 overflow-hidden">
          <div className="grid grid-cols-[28px_28px_1fr_72px_72px_72px_90px_72px_100px_70px_80px] text-[10px] uppercase tracking-widest text-slate-500 bg-black/40 border-b border-white/10">
            <div className="py-2 px-2" />
            <div className="py-2 px-2">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-cyan"
                checked={selected.size > 0 && selected.size === filtered.length}
                ref={(el) => {
                  if (el)
                    el.indeterminate =
                      selected.size > 0 && selected.size !== filtered.length;
                }}
                onChange={(e) => {
                  if (e.target.checked) setSelectedMulti(new Set(filtered.map((s) => s.id)));
                  else clearSelected();
                }}
              />
            </div>
            <div className="py-2 px-2">Step</div>
            <div className="py-2 px-1 text-right">M (s)</div>
            <div className="py-2 px-1 text-right">O (s)</div>
            <div className="py-2 px-1 text-right">Setup</div>
            <div className="py-2 px-1 text-right">Cycle</div>
            <div className="py-2 px-1 text-right">Wait</div>
            <div className="py-2 px-2">Group/Station</div>
            <div className="py-2 px-1 text-right">Deps</div>
            <div className="py-2 px-2 text-right">Actions</div>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              {project.steps.length === 0 ? (
                <>
                  No steps yet. Click <span className="kbd">+ Add Step</span> or load a template from the sidebar.
                </>
              ) : (
                'No steps match filter.'
              )}
            </div>
          )}
          {filtered.map((s, i) => {
            const ss = schedule.steps.find((x) => x.id === s.id) || s;
            const isBn = schedule.bottleneck?.stepIds?.includes(s.id);
            return (
              <StepRow
                key={s.id}
                index={project.steps.findIndex((x) => x.id === s.id) + 1}
                step={s}
                schedule={ss}
                selected={selectedId === s.id}
                multiSelected={selected.has(s.id)}
                dragging={dragId === s.id}
                bottleneck={isBn}
                stations={stations}
                groups={groups}
                onSelect={() => setSelectedId(s.id)}
                onCheck={(e) => toggleSelected(s.id, e)}
                onUpdate={(patch) => updateStep(s.id, patch)}
                onRemove={() => removeStep(s.id)}
                onDuplicate={() => duplicateStep(s.id)}
                onInsertAfter={() => {
                  const n = insertStepAfter(s.id, {
                    name: `Step ${project.steps.length + 1}`,
                    machineTime: 5,
                  });
                  setSelectedId(n.id);
                }}
                onDragStart={() => onDragStart(s.id)}
                onDrop={(pos) => onDrop(s.id, pos)}
                onDropIntoGroup={() => onDropIntoGroup(s.id)}
              />
            );
          })}
        </div>

        {/* Validation issues */}
        {issues.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
              Validation ({issues.length})
            </div>
            <ul className="space-y-1 max-h-40 overflow-auto">
              {issues.map((i, idx) => (
                <li
                  key={idx}
                  className={classNames(
                    'text-[12px] rounded-md px-2 py-1.5 border',
                    i.level === 'error'
                      ? 'border-critical/40 bg-critical/10 text-critical'
                      : 'border-warn/30 bg-warn/10 text-warn',
                  )}
                >
                  <span className="font-mono uppercase text-[10px] mr-2">{i.level}</span>
                  {i.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {/* Right: Inspector */}
      <Panel
        className="col-span-4"
        title="Step Inspector"
        subtitle={current ? current.name : 'Select a step'}
        tone="violet"
        right={
          current ? (
            <span className="chip border border-violet/50 bg-violet/10 text-violet font-mono">
              {current.id.slice(-6)}
            </span>
          ) : null
        }
      >
        {current ? (
          <Inspector
            step={current}
            allSteps={project.steps}
            onChange={(patch) => updateStep(current.id, patch)}
          />
        ) : (
          <div className="p-4 rounded-md border border-dashed border-white/10 bg-black/20 text-sm text-slate-400">
            Click a row on the left to edit times, dependencies, station and MUDA classification. Use drag-drop on a row's top/bottom third to reorder, or middle to merge into a parallel group.
          </div>
        )}

        <div className="divider my-4" />

        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">
            Project Actions
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => captureBaseline()}>
              <IconCheck className="w-3.5 h-3.5" /> Capture Baseline
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                const v = saveVersion(`Snapshot ${new Date().toLocaleTimeString()}`);
                notify(`Saved version · ${v.label}`, 'success');
              }}
            >
              <IconSave className="w-3.5 h-3.5" /> Save Version
            </button>
            <button className="btn-ghost" onClick={() => downloadProjectJson(project)}>
              <IconDownload className="w-3.5 h-3.5" /> Export JSON
            </button>
            <button className="btn-ghost" onClick={() => exportTemplateXlsx()}>
              <IconDownload className="w-3.5 h-3.5" /> Excel template
            </button>
          </div>
        </div>

        <div className="divider my-4" />

        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">
            Process Template Library
          </div>
          <div className="grid grid-cols-1 gap-1.5 max-h-[280px] overflow-auto">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  loadTemplate(t.id);
                  notify(`Loaded template: ${t.name}`, 'success');
                }}
                className="text-left p-2 rounded-md border border-white/10 bg-black/30 hover:border-cyan/40 hover:shadow-neon-cyan transition"
              >
                <div className="text-[13px] text-slate-100">{t.name}</div>
                <div className="text-[10px] text-slate-400">{t.description}</div>
              </button>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-white/10" />;
}

// ---------------------------------------------------------------------------
// Bulk pickers
// ---------------------------------------------------------------------------
function BulkSetStation({ stations, onPick }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState('');
  return (
    <div className="relative">
      <button
        className="btn-ghost"
        onClick={() => setOpen((x) => !x)}
      >
        Set Station
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 glass-strong rounded-md border border-cyan/30 p-2 min-w-[180px]">
          <div className="flex items-center gap-2">
            <input
              value={v}
              onChange={(e) => setV(e.target.value)}
              placeholder="Station id…"
              className="input-industrial flex-1"
            />
            <button
              className="btn-primary text-xs"
              onClick={() => {
                onPick(v || null);
                setOpen(false);
                setV('');
              }}
            >
              Apply
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {stations.map((st) => (
              <button
                key={st}
                className="chip border border-cyan/30 bg-cyan/5 text-cyan hover:bg-cyan/10"
                onClick={() => {
                  onPick(st);
                  setOpen(false);
                }}
              >
                {st}
              </button>
            ))}
            <button
              className="chip border border-critical/30 bg-critical/5 text-critical"
              onClick={() => {
                onPick(null);
                setOpen(false);
              }}
            >
              clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function BulkSetGroup({ groups, onPick }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState('');
  return (
    <div className="relative">
      <button
        className="btn-ghost"
        onClick={() => setOpen((x) => !x)}
      >
        Set Group
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 glass-strong rounded-md border border-violet/30 p-2 min-w-[180px]">
          <div className="flex items-center gap-2">
            <input
              value={v}
              onChange={(e) => setV(e.target.value)}
              placeholder="Group id…"
              className="input-industrial flex-1"
            />
            <button
              className="btn-primary text-xs"
              onClick={() => {
                onPick(v || null);
                setOpen(false);
                setV('');
              }}
            >
              Apply
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {groups.map((g) => (
              <button
                key={g}
                className="chip border border-violet/30 bg-violet/5 text-violet hover:bg-violet/10"
                onClick={() => {
                  onPick(g);
                  setOpen(false);
                }}
              >
                ∥ {g}
              </button>
            ))}
            <button
              className="chip border border-critical/30 bg-critical/5 text-critical"
              onClick={() => {
                onPick(null);
                setOpen(false);
              }}
            >
              clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step row (draggable, editable)
// ---------------------------------------------------------------------------
function StepRow({
  index,
  step,
  schedule,
  selected,
  multiSelected,
  dragging,
  bottleneck,
  stations,
  groups,
  onSelect,
  onCheck,
  onUpdate,
  onRemove,
  onDuplicate,
  onInsertAfter,
  onDragStart,
  onDrop,
  onDropIntoGroup,
}) {
  const [hoverPos, setHoverPos] = useState(null);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        const rel = (e.clientY - r.top) / r.height;
        if (rel < 0.33) setHoverPos('before');
        else if (rel > 0.66) setHoverPos('after');
        else setHoverPos('group');
      }}
      onDragLeave={() => setHoverPos(null)}
      onDrop={(e) => {
        e.preventDefault();
        if (hoverPos === 'group') onDropIntoGroup();
        else onDrop(hoverPos || 'after');
        setHoverPos(null);
      }}
      onClick={onSelect}
      className={classNames(
        'grid grid-cols-[28px_28px_1fr_72px_72px_72px_90px_72px_100px_70px_80px] items-center text-[12px] border-b border-white/5 relative',
        selected ? 'bg-cyan/5' : 'hover:bg-white/5',
        multiSelected && 'ring-1 ring-cyan/40 bg-cyan/5',
        bottleneck && 'ring-1 ring-critical/40',
        dragging && 'opacity-50',
      )}
      style={{ cursor: 'pointer' }}
    >
      {hoverPos === 'before' && (
        <span className="absolute left-0 right-0 -top-[1px] h-0.5 bg-cyan shadow-neon-cyan" />
      )}
      {hoverPos === 'after' && (
        <span className="absolute left-0 right-0 -bottom-[1px] h-0.5 bg-cyan shadow-neon-cyan" />
      )}
      {hoverPos === 'group' && (
        <span className="absolute inset-0 pointer-events-none ring-2 ring-violet/70 rounded-sm" />
      )}

      <div className="py-2 px-2 text-slate-500 cursor-grab">
        <IconGrip className="w-4 h-4" />
      </div>
      <div className="py-2 px-2 flex items-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-cyan"
          checked={multiSelected}
          onChange={onCheck}
        />
      </div>
      <div className="py-2 px-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-slate-500 w-6">{index}</span>
          <input
            value={step.name}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="bg-transparent text-sm outline-none text-slate-100 truncate flex-1 min-w-0 focus:text-cyan"
          />
          {bottleneck && (
            <span className="chip border border-critical/50 bg-critical/10 text-critical">
              BN
            </span>
          )}
          {step.groupId && (
            <span className="chip border border-violet/50 bg-violet/10 text-violet">
              ∥ {step.groupId}
            </span>
          )}
          {!step.isValueAdded && (
            <span className="chip border border-warn/40 bg-warn/10 text-warn">NVA</span>
          )}
        </div>
      </div>
      <NumCell value={step.machineTime} onChange={(v) => onUpdate({ machineTime: v })} />
      <NumCell value={step.operatorTime} onChange={(v) => onUpdate({ operatorTime: v })} />
      <NumCell value={step.setupTime} onChange={(v) => onUpdate({ setupTime: v })} />
      <div className="py-2 px-1 text-right font-mono text-slate-200">
        {schedule.cycleTime?.toFixed(1) || 0}s
      </div>
      <div className="py-2 px-1 text-right font-mono text-warn">
        {schedule.waitTime?.toFixed(1) || 0}s
      </div>
      <div className="py-2 px-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
        <InlineDatalist
          value={step.groupId || ''}
          onChange={(v) => onUpdate({ groupId: v || null })}
          placeholder="group"
          options={groups}
          listId={`groups-${step.id}`}
          tone="violet"
          width={52}
        />
        <InlineDatalist
          value={step.stationId || ''}
          onChange={(v) => onUpdate({ stationId: v || null })}
          placeholder="st"
          options={stations}
          listId={`stations-${step.id}`}
          tone="cyan"
          width={38}
        />
      </div>
      <div className="py-2 px-1 text-right font-mono text-slate-300">
        {step.dependencies?.length || 0}
      </div>
      <div className="py-2 px-2 flex items-center gap-0.5 justify-end" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onInsertAfter}
          className="h-7 w-7 rounded-md grid place-items-center text-slate-400 hover:text-optimal hover:bg-optimal/10"
          title="Insert after"
        >
          <IconPlus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDuplicate}
          className="h-7 w-7 rounded-md grid place-items-center text-slate-400 hover:text-cyan hover:bg-cyan/10"
          title="Duplicate"
        >
          <IconCopy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="h-7 w-7 rounded-md grid place-items-center text-slate-400 hover:text-critical hover:bg-critical/10"
          title="Delete"
        >
          <IconTrash className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function NumCell({ value, onChange }) {
  return (
    <input
      type="number"
      min="0"
      step="0.5"
      value={value ?? 0}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(Number(e.target.value))}
      className="py-1 px-1 text-right font-mono text-sm bg-transparent outline-none text-slate-100 focus:text-cyan w-full"
    />
  );
}

function InlineDatalist({ value, onChange, placeholder, options, listId, tone, width = 50 }) {
  const border =
    tone === 'cyan' ? 'focus:border-cyan/50' : 'focus:border-violet/50';
  return (
    <>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        style={{ width }}
        className={`bg-black/30 border border-white/10 rounded px-1.5 py-0.5 text-[11px] outline-none ${border}`}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------
function Inspector({ step, allSteps, onChange }) {
  const addStep = useStore((s) => s.addStep);
  const suggestions = suggestNextSteps(step);
  const [depQuery, setDepQuery] = useState('');

  const filteredDeps = allSteps
    .filter((s) => s.id !== step.id)
    .filter((s) =>
      depQuery ? s.name.toLowerCase().includes(depQuery.toLowerCase()) : true,
    );

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] uppercase tracking-widest text-slate-400">Name</label>
        <input
          value={step.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="input-industrial w-full mt-1"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <NumField label="Machine" value={step.machineTime} onChange={(v) => onChange({ machineTime: v })} />
        <NumField label="Operator" value={step.operatorTime} onChange={(v) => onChange({ operatorTime: v })} />
        <NumField label="Setup" value={step.setupTime} onChange={(v) => onChange({ setupTime: v })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumField label="Transfer" value={step.transferTime} onChange={(v) => onChange({ transferTime: v })} />
        <NumField label="Variability σ" value={step.variability} onChange={(v) => onChange({ variability: v })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-slate-400">Group ID</label>
          <input
            value={step.groupId || ''}
            onChange={(e) => onChange({ groupId: e.target.value || null })}
            className="input-industrial w-full mt-1"
            placeholder="parallel group"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-slate-400">Station</label>
          <input
            value={step.stationId || ''}
            onChange={(e) => onChange({ stationId: e.target.value || null })}
            className="input-industrial w-full mt-1"
            placeholder="S1, S2…"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={step.isValueAdded}
            onChange={(e) => onChange({ isValueAdded: e.target.checked })}
            className="h-4 w-4 accent-cyan"
          />
          Value-Added
        </label>
        {!step.isValueAdded && (
          <select
            value={step.mudaType || ''}
            onChange={(e) => onChange({ mudaType: e.target.value || null })}
            className="input-industrial text-xs"
          >
            <option value="">MUDA type…</option>
            {MUDA_TYPES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] uppercase tracking-widest text-slate-400">
            Dependencies
          </label>
          <span className="text-[10px] text-slate-500 font-mono">
            {step.dependencies?.length || 0} selected
          </span>
        </div>
        <input
          value={depQuery}
          onChange={(e) => setDepQuery(e.target.value)}
          placeholder="Filter steps…"
          className="input-industrial w-full mb-2 text-xs"
        />
        <div className="max-h-44 overflow-auto space-y-1 p-2 border border-white/10 rounded-md bg-black/20">
          {filteredDeps.length === 0 && (
            <div className="py-3 text-center text-xs text-slate-500">No matches.</div>
          )}
          {filteredDeps.map((s) => {
            const active = step.dependencies?.includes(s.id);
            return (
              <label
                key={s.id}
                className={classNames(
                  'flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-[12px]',
                  active ? 'bg-cyan/10 text-cyan' : 'hover:bg-white/5 text-slate-300',
                )}
              >
                <input
                  type="checkbox"
                  checked={!!active}
                  onChange={() => {
                    const next = active
                      ? step.dependencies.filter((d) => d !== s.id)
                      : [...(step.dependencies || []), s.id];
                    onChange({ dependencies: next });
                  }}
                  className="h-3.5 w-3.5 accent-cyan"
                />
                <IconLink className="w-3 h-3 opacity-60" />
                <span className="truncate">{s.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <IconSparkles className="w-3.5 h-3.5 text-violet" />
          <span className="text-[10px] uppercase tracking-widest text-violet">
            Smart Suggestions
          </span>
        </div>
        <div className="space-y-1.5">
          {suggestions.map((sug) => (
            <button
              key={sug.id}
              onClick={() => {
                addStep({
                  ...sug.template,
                  name: sug.name,
                  dependencies: [step.id],
                  stationId: step.stationId,
                });
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-md border border-violet/30 hover:border-violet/60 bg-violet/5 hover:bg-violet/10 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-100">{sug.name}</span>
                <IconPlus className="w-3 h-3 text-violet" />
              </div>
              <div className="text-[10px] text-slate-400">{sug.reason}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-slate-400">{label}</label>
      <input
        type="number"
        min="0"
        step="0.5"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-industrial w-full mt-1 font-mono"
      />
    </div>
  );
}
