import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';

export default function OnboardingTour() {
  const seen = useStore((s) => s.onboardingSeen);
  const mark = useStore((s) => s.markOnboardingSeen);
  const [i, setI] = useState(0);

  // Allow automation / screenshots to skip the tour via ?noTour=1 or #noTour
  if (
    typeof window !== 'undefined' &&
    (window.location.search.includes('noTour') || window.location.hash.includes('noTour'))
  ) {
    if (!seen) mark();
    return null;
  }

  if (seen) return null;

  const steps = [
    {
      title: 'Welcome to Cycle Time Analyzer',
      body: 'A local-only, desktop-grade industrial engineering console. Everything you do stays in your browser.',
    },
    {
      title: 'Build & analyze your process',
      body: 'Use Cycle Builder to add steps, link dependencies, and create parallel groups by drag-drop. The Gantt shows critical path, takt line, and wait gaps in real time.',
    },
    {
      title: 'Power tools',
      body: 'Command palette (⌘K), Undo/Redo (⌘Z), Simulate what-if changes, auto line-balance, export PDF/Excel/JSON, and version history.',
    },
  ];

  const s = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="glass-strong border border-cyan/40 shadow-neon-cyan rounded-2xl max-w-md w-full p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan via-violet to-critical" />
        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan">Getting started — {i + 1} / {steps.length}</div>
        <div className="text-xl font-semibold mt-1 text-gradient-cool">{s.title}</div>
        <p className="text-sm text-slate-300 mt-3 leading-relaxed">{s.body}</p>
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => mark()}
            className="text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button className="btn-ghost" onClick={() => setI((x) => x - 1)}>
                Back
              </button>
            )}
            <button
              className="btn-primary"
              onClick={() => {
                if (last) mark();
                else setI((x) => x + 1);
              }}
            >
              {last ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
