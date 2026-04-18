import React, { useRef } from 'react';
import Panel from '../components/ui/Panel.jsx';
import { useStore } from '../store/useStore.js';
import { clearAll } from '../lib/storage.js';
import { downloadFullBackup, restoreFullBackup } from '../lib/project-io.js';
import {
  IconTrash,
  IconRefresh,
  IconDownload,
  IconUpload,
  IconHistory,
} from '../components/ui/Icons.jsx';
import { classNames } from '../lib/utils.js';

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetProject = useStore((s) => s.resetProject);
  const notify = useStore((s) => s.notify);
  const toastHistory = useStore((s) => s.toastHistory);
  const clearToasts = useStore((s) => s.clearToasts);
  const backupRef = useRef(null);

  const handleBackupRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await restoreFullBackup(file);
      notify('Backup restored. Reloading…', 'success');
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      notify('Restore failed: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  };

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
                updateSettings({
                  precision: Math.max(0, Math.min(3, Number(e.target.value) | 0)),
                })
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
          <Field label="Labour rate / hour">
            <input
              type="number"
              min="0"
              className="input-industrial w-full font-mono"
              value={settings.labourRate || 0}
              onChange={(e) =>
                updateSettings({ labourRate: Number(e.target.value) || 0 })
              }
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
          <label className="flex items-center gap-2 mt-6 text-sm text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={!!settings.sidebarCollapsed}
              onChange={(e) => updateSettings({ sidebarCollapsed: e.target.checked })}
              className="h-4 w-4 accent-cyan"
            />
            Start with sidebar collapsed
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

      <Panel
        className="col-span-6"
        title="Backup & Restore"
        tone="green"
        right={
          <input
            ref={backupRef}
            type="file"
            accept="application/json"
            onChange={handleBackupRestore}
            className="hidden"
          />
        }
      >
        <p className="text-[12px] text-slate-400 mb-3">
          Download or restore the entire local database — all projects, all versions, and
          settings — as a single JSON file. Useful for moving between machines.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => downloadFullBackup()}>
            <IconDownload className="w-3.5 h-3.5" /> Download Backup
          </button>
          <button className="btn-ghost" onClick={() => backupRef.current?.click()}>
            <IconUpload className="w-3.5 h-3.5" /> Restore from File
          </button>
        </div>
      </Panel>

      <Panel
        className="col-span-6"
        title="Event Log"
        tone="cyan"
        right={
          <button className="btn-ghost text-xs" onClick={clearToasts}>
            <IconTrash className="w-3 h-3" /> Clear
          </button>
        }
      >
        <div className="max-h-56 overflow-auto rounded-md border border-white/10">
          <table className="w-full text-[12px]">
            <thead className="bg-black/40 text-[10px] uppercase tracking-widest text-slate-500 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1.5 w-20">Tone</th>
                <th className="text-left px-2 py-1.5">Message</th>
                <th className="text-right px-2 py-1.5 w-40">When</th>
              </tr>
            </thead>
            <tbody>
              {toastHistory.length === 0 && (
                <tr>
                  <td className="px-2 py-3 text-center text-slate-500" colSpan="3">
                    No events yet.
                  </td>
                </tr>
              )}
              {toastHistory.map((t) => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="px-2 py-1">
                    <span
                      className={classNames(
                        'chip border',
                        t.tone === 'success'
                          ? 'border-optimal/40 bg-optimal/10 text-optimal'
                          : t.tone === 'error'
                          ? 'border-critical/40 bg-critical/10 text-critical'
                          : t.tone === 'warning'
                          ? 'border-warn/40 bg-warn/10 text-warn'
                          : 'border-cyan/40 bg-cyan/10 text-cyan',
                      )}
                    >
                      {t.tone || 'info'}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-slate-200">{t.message}</td>
                  <td className="px-2 py-1 text-right font-mono text-slate-500">
                    {new Date(t.when || t.at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="col-span-12" title="Danger Zone" tone="red">
        <div className="flex flex-wrap gap-3">
          <button
            className="btn-ghost"
            onClick={() => {
              resetProject();
              notify('Reset to default template', 'info');
            }}
          >
            <IconRefresh className="w-3.5 h-3.5" /> Reset Current Project
          </button>
          <button
            className="btn-danger"
            onClick={() => {
              if (confirm('Erase all local data? This cannot be undone.')) {
                clearAll();
                location.reload();
              }
            }}
          >
            <IconTrash className="w-3.5 h-3.5" /> Erase All Local Data
          </button>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Local storage is the only persistence layer. Download a backup first if you need
          to keep anything.
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
