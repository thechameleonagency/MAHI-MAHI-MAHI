import type { Blockage } from "@/types/blockage";
import type { AccountingReviewQueueItem, Expense, Income, Invoice } from "@/types/finance";
import type { AttendanceRecord, Project } from "@/types/project";

export type ProjectInvariantWorld = {
  projects: Project[];
  invoices: Invoice[];
  saleBills: Invoice[];
  expenses: Expense[];
  incomes: Income[];
  blockages: Blockage[];
  accountingReviewQueue: AccountingReviewQueueItem[];
  attendanceRecords: AttendanceRecord[];
};

const kindsRequiringProjectInvoice = new Set<string>(["SOLO_EPC", "PARTNER_EPC", "FIXED_EPC", "INC"]);

function reviewQueueTouchesProject(queue: AccountingReviewQueueItem[], projectId: string, world: ProjectInvariantWorld): boolean {
  return queue.some((q) => {
    if (q.projectId === projectId) return true;
    const inv = [...world.invoices, ...world.saleBills].find((i) => i.id === q.sourceDocumentId);
    if (inv?.projectId === projectId) return true;
    const exp = world.expenses.find((e) => e.id === q.sourceDocumentId);
    if (exp?.projectId === projectId) return true;
    return world.incomes.some((inc) => inc.id === q.sourceDocumentId && inc.projectId === projectId);
  });
}

export class ProjectInvariantService {
  canMarkCompleted(projectId: string, world: ProjectInvariantWorld): { ok: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const project = world.projects.find((p) => p.id === projectId);
    if (!project) {
      return { ok: false, reasons: ["Project not found"] };
    }

    if (!project.customerId?.trim()) {
      reasons.push("Customer linkage (customerId) is required.");
    }

    const activeBlockages = world.blockages.filter((b) => b.projectId === projectId && b.status === "active");
    if (activeBlockages.length > 0) {
      reasons.push(`Resolve ${activeBlockages.length} active blockage(s) before completion.`);
    }

    const kind = project.projectKind ?? "SOLO_EPC";
    if (kindsRequiringProjectInvoice.has(kind)) {
      const docs = [...world.invoices, ...world.saleBills].filter(
        (d) => d.projectId === projectId && d.billingScope !== "company_overhead",
      );
      if (docs.length === 0) {
        reasons.push("At least one invoice or sale bill linked to this project is required before completion.");
      }
    }

    if (reviewQueueTouchesProject(world.accountingReviewQueue, projectId, world)) {
      reasons.push("Clear or retry accounting review queue items for this project before completion.");
    }

    const lines = project.executionLineItems ?? [];
    if (lines.length > 0) {
      for (const line of lines) {
        if (line.issuedQty + 1e-6 < line.quantity) {
          reasons.push(
            `BOQ line "${line.description}" is short: issued ${line.issuedQty} vs quoted ${line.quantity} ${line.unit}.`,
          );
          break;
        }
      }
    }

    return { ok: reasons.length === 0, reasons };
  }

  profitabilityDraft(projectId: string, world: ProjectInvariantWorld): {
    revenue: number;
    expenseDirect: number;
    incomeDirect: number;
    attendanceDays: number;
  } {
    const invTotal = [...world.invoices, ...world.saleBills]
      .filter((i) => i.projectId === projectId)
      .reduce((s, i) => s + (i.total ?? 0), 0);
    const exp = world.expenses
      .filter((e) => e.projectId === projectId)
      .reduce((s, e) => s + e.amount, 0);
    const inc = world.incomes
      .filter((i) => i.projectId === projectId && i.mainCategory === "project")
      .reduce((s, i) => s + i.amount, 0);
    const attDays = world.attendanceRecords.filter((a) => a.sites?.some((site) => site.includes(projectId))).length;
    return {
      revenue: invTotal + inc,
      expenseDirect: exp,
      incomeDirect: inc,
      attendanceDays: attDays,
    };
  }

  /** BOQ lines that are not fully issued (uses execution line issuedQty). */
  materialShortages(project: Project): { lineId: string; description: string; shortQty: number; unit: string }[] {
    const lines = project.executionLineItems ?? [];
    return lines
      .filter((l) => l.issuedQty < l.quantity - 1e-6)
      .map((l) => ({
        lineId: l.id,
        description: l.description,
        shortQty: Math.max(0, l.quantity - l.issuedQty),
        unit: l.unit,
      }));
  }
}
