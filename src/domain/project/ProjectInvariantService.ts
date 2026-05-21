import type { Blockage } from "@/types/blockage";
import type { AccountingReviewQueueItem, Expense, Income, Invoice, PartnerTransaction } from "@/types/finance";
import type { AttendanceRecord, Project } from "@/types/project";
import {
  calculateProjectPartnerEarning,
  isPartnerCreditTransaction,
} from "@/domain/partners/derivePartnerEconomics";
import { resolveProjectPartnerRow } from "@/lib/projectPartnerEconomics";
import {
  ACCOUNTING_REVIEW_QUEUE_COMPLETION_BLOCK_REASON,
  projectHasAccountingReviewQueueBlock,
} from "@/lib/accountingReviewQueueGuidance";
import { projectRequiresClientInvoiceForCompletion } from "@/lib/projectCompletionInvoice";

export type ProjectCreateInvariantInput = {
  /** Project shell about to be persisted (may include `partners[]`). */
  project?: Pick<Project, "partners" | "projectKind">;
  /** When omitted on intake create, SOLO_EPC is rejected. */
  quotationId?: string;
  /** Required for direct-exception create only. */
  directExceptionReason?: string;
};

export type ProjectInvariantValidationResult =
  | { ok: true }
  | { ok: false; errorCode: string; message: string };

export function validateProjectPartnerCount(
  partners?: Project["partners"],
): ProjectInvariantValidationResult {
  if ((partners?.length ?? 0) > 1) {
    return {
      ok: false,
      errorCode: "PARTNER_COUNT",
      message: "At most one external partner per project.",
    };
  }
  return { ok: true };
}

export type ProjectInvariantWorld = {
  projects: Project[];
  invoices: Invoice[];
  saleBills: Invoice[];
  expenses: Expense[];
  incomes: Income[];
  blockages: Blockage[];
  accountingReviewQueue: AccountingReviewQueueItem[];
  attendanceRecords: AttendanceRecord[];
  partnerTransactions?: PartnerTransaction[];
};

export class ProjectInvariantService {
  /**
   * Shared create-time rules for all project command paths (quotation, intake, direct exception).
   */
  validateProjectCreate(input: ProjectCreateInvariantInput): ProjectInvariantValidationResult {
    const partnerCheck = validateProjectPartnerCount(input.project?.partners);
    if (!partnerCheck.ok) {
      return partnerCheck;
    }

    if (input.directExceptionReason !== undefined && !input.directExceptionReason.trim()) {
      return {
        ok: false,
        errorCode: "REASON_REQUIRED",
        message: "Direct project exception requires reason",
      };
    }

    // Intake create without quotation (direct-exception uses a separate command + site payload).
    if (!input.quotationId && input.project !== undefined) {
      const kind = input.project.projectKind ?? "SOLO_EPC";
      if (kind === "SOLO_EPC") {
        return {
          ok: false,
          errorCode: "QUOTATION_REQUIRED",
          message:
            "Solo EPC projects require an approved quotation. Choose another project kind to proceed without a quotation.",
        };
      }
    }

    return { ok: true };
  }

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

    if (projectRequiresClientInvoiceForCompletion(project)) {
      const docs = [...world.invoices, ...world.saleBills].filter(
        (d) => d.projectId === projectId && d.billingScope !== "company_overhead",
      );
      if (docs.length === 0) {
        reasons.push("At least one invoice or sale bill linked to this project is required before completion.");
      } else {
        const unpaid = docs.some((d) => {
          const rec = d.amountReceived ?? 0;
          const tot = d.total ?? 0;
          return d.status !== "paid" && tot - rec > 0.5;
        });
        if (unpaid) {
          reasons.push("All project invoices / sale bills must be fully paid before completion.");
        }
      }
    }

    const partnerRow = resolveProjectPartnerRow(project);
    const forbidPartnerSettlement =
      project.projectKindConfigSnapshot?.forbiddenActions?.includes("partner_settlement");
    if (partnerRow && !forbidPartnerSettlement) {
      const txns = (world.partnerTransactions ?? []).filter(
        (t) => t.partnerId === partnerRow.partnerId && t.projectId === projectId,
      );
      const paid = txns.filter(isPartnerCreditTransaction).reduce((s, t) => s + t.amount, 0);
      const earned = calculateProjectPartnerEarning(project, partnerRow);
      if (earned - paid > 1) {
        reasons.push(
          `Partner settlement pending: settle approx. ₹${Math.round(earned - paid)} due to partner before completion.`,
        );
      }
    }

    if (projectHasAccountingReviewQueueBlock(world.accountingReviewQueue, projectId, world)) {
      reasons.push(ACCOUNTING_REVIEW_QUEUE_COMPLETION_BLOCK_REASON);
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

    const requiredDocs = project.projectKindConfigSnapshot?.requiredDocuments ?? [];
    if (requiredDocs.length > 0) {
      const gen = project.generatedDocuments ?? [];
      const genKeys = new Set(gen.map((d) => d.docKey));
      const legacy = project.documents ?? [];
      const missing = requiredDocs.filter((key) => {
        if (genKeys.has(key)) return false;
        const needle = key.replace(/_/g, " ").toLowerCase();
        return !legacy.some((path) => path.toLowerCase().includes(needle) || path.toLowerCase().includes(key.toLowerCase()));
      });
      if (missing.length > 0) {
        reasons.push(
          `Missing required document evidence for: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}. Generate or upload items in Document studio.`,
        );
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
