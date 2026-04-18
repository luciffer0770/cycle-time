import React, { useEffect, useState } from 'react';

export default function ViewportGuard() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1280,
  );
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1280);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  if (!narrow || dismissed) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="glass-strong border border-critical/40 shadow-neon-red rounded-xl max-w-md p-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-critical">Desktop only</div>
        <div className="text-xl font-semibold mt-2">This tool is built for 1366+ widescreen displays.</div>
        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
          Cycle Time Analyzer is a data-dense industrial engineering console. Rotate your device,
          widen the window, or open it on a laptop/desktop for the best experience.
        </p>
        <div className="mt-4 flex gap-2">
          <button className="btn-ghost" onClick={() => setDismissed(true)}>
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
