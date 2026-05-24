import jsPDF from "jspdf";
import type { EngineCounters, LogEntry } from "@/lib/data-engine/useDataEngineStore";
import type { WorkspaceDataCounts } from "@/lib/data-engine/workspaceDataCounts";

export interface DataEngineReportMeta {
  exportedAt: string;
  engineStatus: string;
  progressPercent: number;
  generationComplete: boolean;
  sessionRole: string;
  engineCounters: EngineCounters;
  liveCounts: WorkspaceDataCounts;
  showcaseScenarios?: number;
  pipelineExtras?: number;
}

function levelLabel(level: LogEntry["level"]): string {
  return level.toUpperCase();
}

function wrapLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

/** Export full data engine run history as a downloadable PDF report. */
export function exportDataEngineLogsPdf(
  logs: LogEntry[],
  meta: DataEngineReportMeta,
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addLine = (text: string, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = wrapLines(doc, text, contentWidth);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size * 0.45 + 2;
    }
  };

  addLine("MSS Autonomous Data Engine — Run Report", 16, true);
  y += 2;
  addLine(`Exported: ${new Date(meta.exportedAt).toLocaleString()}`, 9);
  addLine(`Engine status: ${meta.engineStatus} · Progress: ${meta.progressPercent}%`, 9);
  addLine(`Generation complete flag: ${meta.generationComplete ? "yes" : "no"}`, 9);
  addLine(`Session role during export: ${meta.sessionRole}`, 9);
  if (meta.showcaseScenarios != null) {
    addLine(
      `Scenarios: ${meta.showcaseScenarios} showcase + ${meta.pipelineExtras ?? 0} pipeline extras`,
      9,
    );
  }

  y += 3;
  addLine("Live workspace counts (AppData — what list pages read)", 11, true);
  addLine(
    `Projects ${meta.liveCounts.projects} · Customers ${meta.liveCounts.customers} · Enquiries ${meta.liveCounts.enquiries} · Quotations ${meta.liveCounts.quotations} · Invoices ${meta.liveCounts.invoices} · Employees ${meta.liveCounts.employees}`,
    9,
  );

  y += 2;
  addLine("Engine counters (generator steps)", 11, true);
  addLine(
    `Projects ${meta.engineCounters.projects} · Enquiries ${meta.engineCounters.enquiries} · Quotations ${meta.engineCounters.quotations} · Invoices ${meta.engineCounters.invoices} · Employees ${meta.engineCounters.employees}`,
    9,
  );

  const errors = logs.filter((l) => l.level === "error");
  const successes = logs.filter((l) => l.level === "success");
  y += 2;
  addLine(
    `Log summary: ${logs.length} entries · ${successes.length} success · ${errors.length} error · ${logs.filter((l) => l.level === "warn").length} warn`,
    10,
    true,
  );

  y += 4;
  addLine("Event log (oldest first)", 12, true);
  y += 2;

  const chronological = [...logs].reverse();
  for (const entry of chronological) {
    const prefix = `[${new Date(entry.timestamp).toLocaleString()}] [${levelLabel(entry.level)}]`;
    const body = entry.category ? `${entry.category}: ${entry.message}` : entry.message;
    addLine(`${prefix} ${body}`, 8);
  }

  const stamp = meta.exportedAt.replace(/[:.]/g, "-");
  doc.save(`mss-data-engine-report-${stamp}.pdf`);
}
