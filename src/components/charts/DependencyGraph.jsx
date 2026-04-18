import React, { useMemo } from 'react';
import { computeSchedule } from '../../lib/engine.js';

// Auto-layout DAG using longest-path-from-root layering:
//   layer(s) = 0 if no deps, else 1 + max(layer(dep))
// Rows inside a layer are laid out vertically by start time.
export default function DependencyGraph({ steps, highlightId, onSelect }) {
  const { schedule, nodes, edges, W, H } = useMemo(() => {
    const schedule = computeSchedule(steps);
    const layer = new Map();
    const byId = new Map(steps.map((s) => [s.id, s]));
    const visit = (id, seen = new Set()) => {
      if (layer.has(id)) return layer.get(id);
      if (seen.has(id)) return 0;
      seen.add(id);
      const s = byId.get(id);
      const deps = (s?.dependencies || []).filter((d) => byId.has(d));
      const L = deps.length ? 1 + Math.max(...deps.map((d) => visit(d, seen))) : 0;
      layer.set(id, L);
      return L;
    };
    steps.forEach((s) => visit(s.id));

    // Group by layer
    const layers = new Map();
    steps.forEach((s) => {
      const l = layer.get(s.id) || 0;
      if (!layers.has(l)) layers.set(l, []);
      layers.get(l).push(s);
    });
    // Sort within layer by start time (from schedule) then name
    const critSet = new Set();
    schedule.units.forEach((u) => {
      if (u.isCritical) u.stepIds.forEach((sid) => critSet.add(sid));
    });
    const sched = new Map(schedule.steps.map((s) => [s.id, s]));
    Array.from(layers.values()).forEach((arr) => {
      arr.sort((a, b) => (sched.get(a.id)?.startTime || 0) - (sched.get(b.id)?.startTime || 0));
    });

    const LAYER_W = 200;
    const NODE_H = 46;
    const NODE_W = 170;
    const GAP_Y = 12;

    const nodes = [];
    const positions = new Map();
    const maxLayer = Math.max(...Array.from(layers.keys()), 0);
    const layerHeights = [];
    for (let l = 0; l <= maxLayer; l++) {
      const arr = layers.get(l) || [];
      layerHeights.push(arr.length * (NODE_H + GAP_Y));
    }
    const maxH = Math.max(NODE_H, ...layerHeights);

    layers.forEach((arr, l) => {
      const colH = arr.length * (NODE_H + GAP_Y) - GAP_Y;
      let yStart = (maxH - colH) / 2;
      arr.forEach((s, idx) => {
        const x = 20 + l * LAYER_W;
        const y = yStart + idx * (NODE_H + GAP_Y);
        positions.set(s.id, { x, y, w: NODE_W, h: NODE_H });
        const ss = sched.get(s.id) || s;
        nodes.push({
          id: s.id,
          x,
          y,
          w: NODE_W,
          h: NODE_H,
          name: s.name,
          cycleTime: ss.cycleTime || 0,
          startTime: ss.startTime || 0,
          isValueAdded: s.isValueAdded,
          isCritical: critSet.has(s.id),
          station: s.stationId,
          groupId: s.groupId,
        });
      });
    });

    const edges = [];
    steps.forEach((s) => {
      (s.dependencies || []).forEach((d) => {
        const from = positions.get(d);
        const to = positions.get(s.id);
        if (!from || !to) return;
        const isCritical = critSet.has(s.id) && critSet.has(d);
        edges.push({
          x1: from.x + from.w,
          y1: from.y + from.h / 2,
          x2: to.x,
          y2: to.y + to.h / 2,
          isCritical,
        });
      });
    });

    const W = 20 + (maxLayer + 1) * LAYER_W;
    const H = maxH + 10;
    return { schedule, nodes, edges, W, H };
  }, [steps]);

  if (!nodes.length) {
    return (
      <div className="h-48 grid place-items-center text-slate-500 text-sm">
        No steps. Add steps in Cycle Builder to see the dependency graph.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-md border border-white/5 bg-black/20">
      <svg
        width={W}
        height={H}
        style={{ display: 'block', minWidth: '100%' }}
        className="select-none"
      >
        <defs>
          <linearGradient id="n-crit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E11D2E" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
          <linearGradient id="n-va" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="n-nva" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <marker
            id="arrow-cyan"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(6,182,212,0.7)" />
          </marker>
          <marker
            id="arrow-red"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(225,29,46,0.9)" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const dx = (e.x2 - e.x1) * 0.5;
          const path = `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`;
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke={e.isCritical ? 'rgba(225,29,46,0.85)' : 'rgba(6,182,212,0.45)'}
              strokeWidth={e.isCritical ? 2 : 1.25}
              markerEnd={e.isCritical ? 'url(#arrow-red)' : 'url(#arrow-cyan)'}
              style={{
                filter: e.isCritical ? 'drop-shadow(0 0 6px rgba(225,29,46,0.5))' : undefined,
              }}
            />
          );
        })}

        {nodes.map((n) => {
          const fill = n.isCritical
            ? 'url(#n-crit)'
            : n.isValueAdded
            ? 'url(#n-va)'
            : 'url(#n-nva)';
          return (
            <g
              key={n.id}
              transform={`translate(${n.x} ${n.y})`}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
              onClick={() => onSelect?.(n.id)}
            >
              <rect
                width={n.w}
                height={n.h}
                rx={8}
                fill="rgba(15,23,42,0.85)"
                stroke={highlightId === n.id ? '#06B6D4' : 'rgba(148,163,184,0.25)'}
                strokeWidth={highlightId === n.id ? 2 : 1}
              />
              <rect
                x={0}
                y={0}
                width={5}
                height={n.h}
                rx={2}
                fill={fill}
                style={{
                  filter: n.isCritical
                    ? 'drop-shadow(0 0 8px rgba(225,29,46,0.7))'
                    : undefined,
                }}
              />
              <text
                x={14}
                y={18}
                fontSize="12"
                fill="#e2e8f0"
                fontWeight="600"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {trim(n.name, 22)}
              </text>
              <text
                x={14}
                y={34}
                fontSize="10"
                fill="#94a3b8"
                fontFamily="JetBrains Mono, monospace"
              >
                {n.cycleTime.toFixed(1)}s
                {n.station ? ` · ${n.station}` : ''}
                {n.groupId ? ` · ∥${n.groupId}` : ''}
              </text>
              {n.isCritical && (
                <circle cx={n.w - 10} cy={10} r={3} fill="#E11D2E" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function trim(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
