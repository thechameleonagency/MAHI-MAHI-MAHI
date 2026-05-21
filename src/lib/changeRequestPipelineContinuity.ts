import type { AppState } from "@/contexts/AppDataContext";
import { resolveChangeRequestDeltaAmount } from "@/lib/changeRequestApproval";
import { isPlaceholderChangeRequestInvoiceId } from "@/lib/changeRequestDeltaInvoice";
import type { ProjectChangeRequest } from "@/types/operations";

export type StaleChangeRequestBilling = {
  changeRequestId: string;
  projectId: string;
  reason: "missing_invoice" | "placeholder_invoice_id" | "invoice_not_found" | "invoice_not_on_project";
};

function expectedDelta(state: AppState, cr: ProjectChangeRequest): number {
  const project = state.projects.find((p) => p.id === cr.projectId);
  if (!project) return cr.deltaAmount ?? 0;
  return resolveChangeRequestDeltaAmount(project, cr) || cr.deltaAmount || 0;
}

/** Approved scope changes with billable delta must reference a real invoice on the project. */
export function findStaleChangeRequestBilling(state: AppState): StaleChangeRequestBilling[] {
  const stale: StaleChangeRequestBilling[] = [];
  for (const cr of state.projectChangeRequests ?? []) {
    if (cr.status !== "approved") continue;
    const delta = expectedDelta(state, cr);
    if (delta <= 0) continue;

    if (!cr.generatedInvoiceId?.trim()) {
      stale.push({ changeRequestId: cr.id, projectId: cr.projectId, reason: "missing_invoice" });
      continue;
    }
    if (isPlaceholderChangeRequestInvoiceId(cr.generatedInvoiceId)) {
      stale.push({
        changeRequestId: cr.id,
        projectId: cr.projectId,
        reason: "placeholder_invoice_id",
      });
      continue;
    }
    const invoice = state.invoices.find((i) => i.id === cr.generatedInvoiceId);
    if (!invoice) {
      stale.push({ changeRequestId: cr.id, projectId: cr.projectId, reason: "invoice_not_found" });
      continue;
    }
    const project = state.projects.find((p) => p.id === cr.projectId);
    const onProject =
      project?.invoiceIds?.includes(invoice.id) || project?.invoiceId === invoice.id;
    if (!onProject) {
      stale.push({
        changeRequestId: cr.id,
        projectId: cr.projectId,
        reason: "invoice_not_on_project",
      });
    }
  }
  return stale;
}
