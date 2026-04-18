import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AppShell from './components/shell/AppShell.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CycleBuilderPage from './pages/CycleBuilderPage.jsx';
import GanttPage from './pages/GanttPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SimulationPage from './pages/SimulationPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import CommandPalette from './components/ui/CommandPalette.jsx';
import ShortcutsModal from './components/ui/ShortcutsModal.jsx';
import ViewportGuard from './components/ui/ViewportGuard.jsx';
import OnboardingTour from './components/ui/OnboardingTour.jsx';
import { useStore } from './store/useStore.js';

export default function App() {
  const project = useStore((s) => s.getActiveProject());
  const nav = useNavigate();
  const toggleCmd = useStore((s) => s.toggleCommandPalette);
  const setShortcuts = useStore((s) => s.setShortcutsOpen);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const notify = useStore((s) => s.notify);

  // Seed simulation
  useEffect(() => {
    if (project && !project.simulationSteps?.length && project.steps?.length) {
      useStore.getState().copyToSimulation();
    }
  }, [project?.id, project?.simulationSteps?.length, project?.steps?.length]);

  // Global shortcuts
  useEffect(() => {
    function onKey(e) {
      const mod = e.metaKey || e.ctrlKey;
      const tag = (e.target?.tagName || '').toUpperCase();
      const isText = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;

      // Cmd/Ctrl-K — command palette (allow even inside inputs)
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCmd();
        return;
      }
      // ? — shortcuts modal
      if (!isText && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setShortcuts(true);
        return;
      }
      // Cmd/Ctrl-Z — undo
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (isText) return;
        e.preventDefault();
        undo();
        notify('Undo', 'info');
        return;
      }
      // Cmd/Ctrl-Shift-Z or Cmd-Y — redo
      if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        if (isText) return;
        e.preventDefault();
        redo();
        notify('Redo', 'info');
        return;
      }
      // g d / g b / g g / g a / g s / g r / g t — quick nav (after `g`)
      if (!isText && e.key === 'g') {
        window.__ctaGoto = true;
        setTimeout(() => (window.__ctaGoto = false), 900);
        return;
      }
      if (!isText && window.__ctaGoto) {
        const map = {
          d: '/dashboard',
          b: '/builder',
          g: '/gantt',
          a: '/analytics',
          s: '/simulation',
          r: '/reports',
          t: '/settings',
        };
        if (map[e.key]) {
          e.preventDefault();
          nav(map[e.key]);
          window.__ctaGoto = false;
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav, toggleCmd, setShortcuts, undo, redo, notify]);

  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/builder" element={<CycleBuilderPage />} />
          <Route path="/gantt" element={<GanttPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/simulation" element={<SimulationPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
      <CommandPalette />
      <ShortcutsModal />
      <ViewportGuard />
      <OnboardingTour />
    </>
  );
}
