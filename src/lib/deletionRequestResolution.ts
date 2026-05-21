import type { AppState } from "@/contexts/AppDataContext";
import { canDeleteQuotationRecord } from "@/lib/quotationProjectConversionPolicy";
import type { DeletionRequest } from "@/types/blockage";

export function deletionRequestEntityHref(req: DeletionRequest): string {
  switch (req.entityType) {
    case "quotation":
      return `/quotations?open=${encodeURIComponent(req.entityId)}`;
    case "project":
      return `/projects/${encodeURIComponent(req.entityId)}`;
    case "invoice":
    case "sale-bill":
      return `/invoices?invoice=${encodeURIComponent(req.entityId)}`;
    default:
      return "/settings?tab=deletion-queue";
  }
}

export function formatDeletionEntityType(entityType: DeletionRequest["entityType"]): string {
  switch (entityType) {
    case "sale-bill":
      return "Sale bill";
    case "quotation":
      return "Quotation";
    case "project":
      return "Project";
    case "invoice":
      return "Invoice";
    default:
      return entityType;
  }
}

/** Pre-flight before approve executes destructive delete (ER7 / PR2). */
export function validateDeletionRequestApproval(
  state: AppState,
  request: DeletionRequest,
): { ok: true } | { ok: false; error: string } {
  if (request.status !== "pending") {
    return { ok: false, error: "Only pending requests can be approved" };
  }

  switch (request.entityType) {
    case "quotation": {
      const quotation = state.quotations.find((q) => q.id === request.entityId);
      if (!quotation) return { ok: false, error: "Quotation no longer exists" };
      const gate = canDeleteQuotationRecord(quotation, {
        projects: state.projects,
        accruals: state.agentCommissionAccruals ?? [],
        invoices: state.invoices,
      });
      if (!gate.ok) return { ok: false, error: gate.message };
      return { ok: true };
    }
    case "project": {
      if (!state.projects.some((p) => p.id === request.entityId)) {
        return { ok: false, error: "Project no longer exists" };
      }
      return { ok: true };
    }
    case "invoice": {
      if (!state.invoices.some((i) => i.id === request.entityId)) {
        return { ok: false, error: "Invoice no longer exists" };
      }
      return { ok: true };
    }
    case "sale-bill": {
      if (!state.saleBills.some((s) => s.id === request.entityId)) {
        return { ok: false, error: "Sale bill no longer exists" };
      }
      return { ok: true };
    }
    default:
      return { ok: false, error: "Unsupported entity type" };
  }
}
