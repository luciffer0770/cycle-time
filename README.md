# Cycle Time Analyzer — Advanced Industrial Engineering Tool

A desktop-only, single-page React application for manufacturing engineers.
Purpose-built for:

- Cycle time analysis
- Line balancing
- Bottleneck detection
- Process optimization
- What-if simulation

All data lives in the browser's `localStorage` — **no backend, no server calls**.

---

## Quick start

```bash
npm install
npm run dev     # → http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

Optimized for **1920×1080 / 1600+ width desktops**. The UI deliberately does
not support mobile viewports.

---

## Architecture

```
src/
  lib/
    engine.js       # Cycle-time math, DAG, critical path, bottleneck
    analytics.js    # Bottleneck %, VA/NVA, takt gap, line-balancing, AI
    storage.js      # saveProject / loadProject / saveVersion / loadVersions
    excel.js        # SheetJS import / export
    pdf.js          # jsPDF report export
    templates.js    # Prebuilt process templates
    utils.js
  store/
    useStore.js     # Zustand store (auto-saves on every change)
  components/
    shell/          # Sidebar + TopBar (takt, KPIs, bottleneck alert)
    gantt/          # Core Gantt visualization (machine/operator/wait)
    ui/             # KpiCard, Panel, Toast, Icons
  pages/
    DashboardPage.jsx
    CycleBuilderPage.jsx
    GanttPage.jsx
    AnalyticsPage.jsx
    SimulationPage.jsx
    ReportsPage.jsx
    SettingsPage.jsx
```

## Core calculation engine (`lib/engine.js`)

1. **Cycle time** &nbsp; `cycleTime = machineTime + operatorTime + setupTime`
2. **Parallel groups** — steps sharing a `groupId` collapse into a single
   unit whose duration is `MAX(cycleTime)`.
3. **DAG scheduling** — dependencies drive `startTime = MAX(end of deps)`.
4. **Critical path** — longest path through the unit-level DAG; total
   cycle time = end of the final critical unit.
5. **Wait time** — `startTime - MAX(end of step-level deps)`, floored at 0.
6. **Bottleneck** — the critical-path unit with the largest duration.
7. **Efficiency** — `valueAddedTime / totalCycleTime`.
8. **Cycle detection** — topological sort flags circular dependencies.

All calculations are deterministic and run synchronously on every state
change; the whole project re-renders in real time.

## Analytics engine (`lib/analytics.js`)

- Bottleneck contribution % of critical path
- VA vs NVA ratio
- Takt gap (`taktTime - totalCycleTime`) and utilization
- Step impact sensitivity (1-second leverage per step)
- Line balancing (per-station load) + greedy LPT auto-balance
- Variability (min / max / avg / σ)
- Validation (zero / negative / circular / unrealistic)
- `suggestNextSteps(step)` — adds cooling, automation, inspection, transfer
- `suggestOptimization(steps)` — top-5 leverage-ranked reductions
- `simulateRemoveStep` — what-if removal with instant delta

## Simulation engine

`simulationSteps` is cloned from the live `steps`. The Simulation page
shows side-by-side before/after Gantts and a live comparison of
cycle time, efficiency, wait, and bottleneck shift. Apply to project
commits the simulation.

## Storage (`lib/storage.js`)

- `saveProject` / `loadProject` — single active project, auto-saved on
  every Zustand mutation.
- `saveVersion` / `loadVersions` / `deleteVersion` — version history
  (shown on the Reports page).
- `saveSettings` / `loadSettings`.
- `clearAll` — nukes everything (Settings → Danger Zone).

## Excel integration (`lib/excel.js`)

Import `.xlsx` / `.csv`. Column resolution is tolerant of common headers:

| Data        | Accepted headers                                       |
| ----------- | ------------------------------------------------------ |
| Step Name   | `Step Name`, `Name`, `Step`, `Operation`, `Activity`   |
| Machine     | `Machine Time`, `Machine`, `M/C Time`                  |
| Operator    | `Operator Time`, `Operator`, `Manual Time`             |
| Setup       | `Setup`, `Setup Time`, `Changeover`                    |
| Dependencies| `Dependencies`, `Depends On`, `Predecessors`           |
| Group       | `Group`, `Group ID`, `Parallel Group`                  |
| Station     | `Station`, `Station ID`, `Workstation`                 |
| Value Added | `Value Added`, `VA`, `Is Value Added`                  |

Dependencies reference steps by name (case-insensitive, comma / semicolon / pipe
separated). Exports produce `Steps` + `Summary` sheets.

## Drag & drop

- Drag a row onto another row's **top third** → drop **before**
- Drag onto **bottom third** → drop **after**
- Drag onto **middle** → merge into a **parallel group**

Groups are auto-created if the target row has none.

## Visual language

Palette (`tailwind.config.js`):

| Token     | Hex       | Meaning                |
| --------- | --------- | ---------------------- |
| critical  | `#E11D2E` | Bottleneck             |
| violet    | `#6D28D9` | System / depth         |
| machine   | `#1E40AF` | Machine time           |
| cyan      | `#06B6D4` | Data flow / operator   |
| optimal   | `#22C55E` | Value-added / optimal  |

Background is a fixed industrial gradient; panels use glassmorphism
(`backdrop-blur-xl` + low-opacity fills) with neon edge shadows.

## Pages

- **Dashboard** — KPI cards (cycle, efficiency, bottleneck, OEE),
  mini Gantt, critical-path contribution bars, distribution histogram,
  VA/NVA donut, AI recommendations.
- **Cycle Builder** — table of steps with inline editing, draggable
  reorder + parallel group merging, inspector with smart suggestions,
  template library, Excel import/export.
- **Gantt View** — full-width Gantt with heatmap mode, zoom, takt-line,
  critical-path breakdown, schedule table.
- **Analytics** — bottleneck bars, distribution, line-balance chart +
  auto-balance button, step-impact sensitivity, AI optimizer,
  multi-line comparison.
- **Simulation** — live neon sliders for machine / operator / setup
  per step, before/after Gantt comparison, apply-to-project.
- **Reports** — dark preview of the PDF / Excel report plus full
  version control.
- **Settings** — units, defaults, OEE inputs, danger zone.

## License

Private / internal engineering use.
