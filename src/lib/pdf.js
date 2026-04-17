import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { computeSchedule, efficiency, oee } from './engine.js';
import {
  bottleneckContributions,
  vaVsNva,
  taktGap,
  variability,
  suggestOptimization,
} from './analytics.js';

function header(doc, project) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 60, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('Cycle Time Analyzer – Engineering Report', 40, 30);
  doc.setFontSize(10);
  doc.setTextColor(200, 215, 240);
  doc.text(
    `Project: ${project.name}   •   Takt: ${project.taktTime}s   •   Generated: ${new Date().toLocaleString()}`,
    40,
    48,
  );
  doc.setTextColor(30, 41, 59);
}

export function exportReportPdf(project, settingsLike = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const schedule = computeSchedule(project.steps);
  const eff = efficiency(schedule);
  const tg = taktGap(schedule, project.taktTime);
  const va = vaVsNva(project.steps);
  const vari = variability(project.steps);
  const opt = suggestOptimization(project.steps);
  const oeeR = oee(settingsLike?.oee);

  header(doc, project);

  let y = 80;
  doc.setFontSize(12);
  doc.text('Key Performance Indicators', 40, y);
  y += 8;

  autoTable(doc, {
    startY: y + 6,
    head: [['KPI', 'Value']],
    body: [
      ['Total Cycle Time', `${schedule.totalCycleTime.toFixed(2)} s`],
      ['Takt Time', `${project.taktTime} s`],
      ['Takt Gap', `${tg.gap.toFixed(2)} s (${tg.meetsTakt ? 'Within takt' : 'Over takt'})`],
      ['Value-Added', `${va.va.toFixed(1)} s (${va.vaPct.toFixed(1)}%)`],
      ['Non-Value-Added', `${va.nva.toFixed(1)} s (${va.nvaPct.toFixed(1)}%)`],
      ['Efficiency', `${(eff * 100).toFixed(1)} %`],
      ['OEE', `${(oeeR.oee * 100).toFixed(1)} %`],
      [
        'Bottleneck',
        schedule.bottleneck?.stepNames?.join(' + ') || '—',
      ],
      ['Steps (count)', `${schedule.steps.length}`],
      [
        'Variability (min/avg/max/σ)',
        `${vari.min.toFixed(1)} / ${vari.avg.toFixed(1)} / ${vari.max.toFixed(1)} / ${vari.std.toFixed(1)}`,
      ],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
  });

  y = doc.lastAutoTable.finalY + 18;
  doc.text('Schedule', 40, y);

  autoTable(doc, {
    startY: y + 6,
    head: [
      [
        '#',
        'Step',
        'Station',
        'Group',
        'M (s)',
        'O (s)',
        'Setup',
        'CT (s)',
        'Start',
        'End',
        'Wait',
        'VA',
        'Critical',
      ],
    ],
    body: schedule.steps.map((s, i) => [
      i + 1,
      s.name,
      s.stationId || '',
      s.groupId || '',
      s.machineTime,
      s.operatorTime,
      s.setupTime,
      s.cycleTime.toFixed(1),
      s.startTime.toFixed(1),
      s.endTime.toFixed(1),
      s.waitTime.toFixed(1),
      s.isValueAdded ? '✓' : '',
      s.isCritical ? '●' : '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
  });

  y = doc.lastAutoTable.finalY + 18;
  if (y > 740) {
    doc.addPage();
    y = 60;
  }
  doc.text('Critical Path & Bottlenecks', 40, y);
  const bc = bottleneckContributions(schedule);
  autoTable(doc, {
    startY: y + 6,
    head: [['Rank', 'Unit', 'Steps', 'Duration (s)', 'Contribution']],
    body: bc.map((b, i) => [
      i + 1,
      b.kind,
      b.stepIds
        .map((sid) => schedule.steps.find((x) => x.id === sid)?.name)
        .filter(Boolean)
        .join(' + '),
      b.duration.toFixed(1),
      `${b.pct.toFixed(1)}%`,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [225, 29, 46], textColor: 255 },
  });

  y = doc.lastAutoTable.finalY + 18;
  if (y > 740) {
    doc.addPage();
    y = 60;
  }
  doc.text('AI Optimization Recommendations', 40, y);
  autoTable(doc, {
    startY: y + 6,
    head: [['#', 'Step', 'Suggested Reduction', 'Expected Gain', 'Rationale']],
    body: opt.map((o, i) => [
      i + 1,
      o.stepName,
      `${o.reductionPct}% (~${o.reductionSeconds}s)`,
      `${o.expectedGainSeconds.toFixed(1)}s (${o.expectedGainPct.toFixed(1)}%)`,
      o.rationale,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94], textColor: 255 },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 150);
    doc.text(
      `Page ${i} of ${pages}   •   Cycle Time Analyzer`,
      40,
      doc.internal.pageSize.getHeight() - 24,
    );
  }

  doc.save(`${(project.name || 'report').replace(/\s+/g, '_')}_report.pdf`);
}
