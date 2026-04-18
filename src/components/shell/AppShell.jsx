import React from 'react';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import StatusBar from './StatusBar.jsx';
import Toast from '../ui/Toast.jsx';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-industrial text-slate-100">
      <div className="fixed inset-0 grid-overlay pointer-events-none opacity-40" />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-5 overflow-x-hidden overflow-y-auto">{children}</main>
          <StatusBar />
        </div>
      </div>
      <Toast />
    </div>
  );
}
