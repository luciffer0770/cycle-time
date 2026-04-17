import React from 'react';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import Toast from '../ui/Toast.jsx';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-industrial text-slate-100">
      <div className="fixed inset-0 grid-overlay pointer-events-none opacity-40" />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
          <footer className="px-6 py-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-white/5">
            <span className="font-mono">
              CTA v1.0 · Industrial Engineering Console · local-only
            </span>
            <span className="font-mono">
              {new Date().toLocaleString()}
            </span>
          </footer>
        </div>
      </div>
      <Toast />
    </div>
  );
}
