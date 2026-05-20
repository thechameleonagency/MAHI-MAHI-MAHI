import { projectKindConfigs } from "@/domain/projectTypes/config";
import type { ProjectKind } from "@/domain/projectTypes/types";
import type { Invoice } from "@/types/finance";
import type { Project } from "@/types/project";

const INVOICE_BAL_EPS = 0.01;

/** Legacy kinds that required a project-linked bill before completion (pre-snapshot flag). */
const LEGACY_KINDS_REQUIRING_CLIENT_INVOICE = new Set<ProjectKind>([
  "SOLO_EPC",
  "PARTNER_EPC",
  "FIXED_EPC",
  "INC",
]);

/**
 * Whether lifecycle completion must have ≥1 project-linked bill fully settled.
 * Vendorship-only and outsourced INC paths bill via partner/subcontractor, not MSS client invoices.
 */
export function projectRequiresClientInvoiceForCompletion(
  project: Pick<Project, "projectKind" | "projectKindConfigSnapshot">,
): boolean {
  const snap = project.projectKindConfigSnapshot;
  if (typeof snap?.requiresClientInvoice === "boolean") {
    return snap.requiresClientInvoice;
  }
  const kind = (project.projectKind ?? "SOLO_EPC") as ProjectKind;
  const cfg = projectKindConfigs[kind];
  if (typeof cfg?.requiresClientInvoice === "boolean") {
    return cfg.requiresClientInvoice;
  }
  return LEGACY_KINDS_REQUIRING_CLIENT_INVOICE.has(kind);
}

/** L05 / L11: require ≥1 project bill and no positive balance when client invoice is required. */
export function projectCompletionInvoiceBlockReason(
  project: Pick<Project, "projectKind" | "projectKindConfigSnapshot">,
  projectBills: Pick<Invoice, "total" | "amountReceived" | "invoiceNumber">[],
): string | null {
  if (!projectRequiresClientInvoiceForCompletion(project)) {
    return null;
  }
  if (projectBills.length === 0) {
    return "Add at least one invoice or sale bill linked to this project before completion.";
  }
  for (const inv of projectBills) {
    const bal = (inv.total ?? 0) - (inv.amountReceived ?? 0);
    if (bal > INVOICE_BAL_EPS) {
      const label = inv.invoiceNumber?.trim() || "bill";
      return `Outstanding ₹${Math.round(bal)} on ${label}. Record payments until every project bill is fully settled.`;
    }
  }
  return null;
}
