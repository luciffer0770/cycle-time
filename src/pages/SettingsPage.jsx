import React from 'react';
import Panel from '../components/ui/Panel.jsx';
import { useStore } from '../store/useStore.js';
import { clearAll } from '../lib/storage.js';
import { IconTrash, IconRefresh } from '../components/ui/Icons.jsx';

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetProject = useStore((s) => s.resetProject);
  const notify = useStore((s) => s.notify);

  return (
    <div className="grid grid-cols-12 gap-4">
      <Panel className="col-span-6" title="Defaults" tone="cyan">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Time Unit">
            <select
              className="input-industrial w-full"
              value={settings.timeUnit}
              onChange={(e) => updateSettings({ timeUnit: e.target.value })}
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
            </select>
          </Field>
          <Field label="Default Takt Time">
            <input
              type="number"
              min="0"
              className="input-industrial w-full font-mono"
              value={settings.defaultTaktTime}
              onChange={(e) =>
                updateSettings({ defaultTaktTime: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Station Count (Auto-Balance)">
            <input
              type="number"
              min="1"
              max="20"
              className="input-industrial w-full font-mono"
              value={settings.stationCount}
              onChange={(e) =>
                updateSettings({ stationCount: Math.max(1, Number(e.target.value) | 0) })
              }
            />
          </Field>
          <Field label="Numeric Precision">
            <input
              type="number"
              min="0"
              max="3"
              className="input-industrial w-full font-mono"
              value={settings.precision}
              onChange={(e) =>
                updateSettings({ precision: Math.max(0, Math.min(3, Number(e.target.value) | 0)) })
              }
            />
          </Field>
          <Field label="Currency (reports)">
            <input
              className="input-industrial w-full"
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 mt-6 text-sm text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={!!settings.autoSave}
              onChange={(e) => updateSettings({ autoSave: e.target.checked })}
              className="h-4 w-4 accent-cyan"
            />
            Auto-save to local storage
          </label>
        </div>
      </Panel>

      <Panel className="col-span-6" title="OEE Inputs" tone="violet">
        <div className="space-y-3">
          <RangeField
            label="Availability"
            value={settings.oee?.availability ?? 0.9}
            onChange={(v) => updateSettings({ oee: { ...settings.oee, availability: v } })}
          />
          <RangeField
            label="Performance"
            value={settings.oee?.performance ?? 0.95}
            onChange={(v) => updateSettings({ oee: { ...settings.oee, performance: v } })}
          />
          <RangeField
            label="Quality"
            value={settings.oee?.quality ?? 0.99}
            onChange={(v) => updateSettings({ oee: { ...settings.oee, quality: v } })}
          />
        </div>
        <div className="divider my-4" />
        <div className="text-[11px] text-slate-400 font-mono">
          OEE = A × P × Q ={' '}
          <b className="text-optimal">
            {(
              (settings.oee?.availability ?? 0.9) *
              (settings.oee?.performance ?? 0.95) *
              (settings.oee?.quality ?? 0.99) *
              100
            ).toFixed(2)}
            %
          </b>
        </div>
      </Panel>

      <Panel className="col-span-12" title="Danger Zone" tone="red">
        <div className="flex flex-wrap gap-3">
          <button
            className="btn-ghost"
            onClick={() => {
              resetProject();
              notify('Reset to default project', 'info');
            }}
          >
            <IconRefresh className="w-3.5 h-3.5" /> Reset Current Project
          </button>
          <button
            className="btn-danger"
            onClick={() => {
              clearAll();
              location.reload();
            }}
          >
            <IconTrash className="w-3.5 h-3.5" /> Erase All Local Data
          </button>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Local storage is the only persistence layer. Exports remain untouched.
        </p>
      </Panel>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-slate-400">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function RangeField({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-slate-400">{label}</span>
        <span className="font-mono text-[12px] text-slate-100">
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <input
        type="range"
        className="neon-range mt-2"
        min={0}
        max={1}
        step={0.005}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
