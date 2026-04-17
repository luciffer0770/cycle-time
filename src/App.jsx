import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/shell/AppShell.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CycleBuilderPage from './pages/CycleBuilderPage.jsx';
import GanttPage from './pages/GanttPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SimulationPage from './pages/SimulationPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { useStore } from './store/useStore.js';

export default function App() {
  const project = useStore((s) => s.project);

  // Ensure simulation is seeded on first load
  useEffect(() => {
    if (!project?.simulationSteps?.length && project?.steps?.length) {
      useStore.getState().copyToSimulation();
    }
  }, [project?.simulationSteps?.length, project?.steps?.length]);

  return (
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
  );
}
