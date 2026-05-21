/**
 * E2 — Quotation → project conversion is one-shot
 *
 * Each approved quotation may spawn **at most one** project (`linkedProjectId`).
 * After conversion the quotation is terminal — it cannot be revised or re-converted.
 *
 * Mid-project commercial / scope changes use:
 * - **Change requests** (all project kinds)
 * - **Additional work lines** (INC / INC_GIVEN)
 *
 * To quote again for the same customer, **clone** the quotation into a new draft (new id, no project link).
 */

import { isQuotationConverted, quotationLinkedProjectId } from "@/lib/quotationProjectLink";
import type { Quotation, QuotationStatus } from "@/types/project";
import type { AgentCommissionAccrual } from "@/types/operations";
import type { Invoice } from "@/types/finance";

export const QUOTATION_ONE_SHOT_CONVERSION_HELP =
  "Each quotation converts to one project only. The quotation becomes read-only after conversion.";

export const PROJECT_SCOPE_CHANGE_GUIDANCE =
  "Scope or pricing changes after go-live use Change requests on this project (and Additional work for INC jobs) — not a second project from the same quotation.";

export const QUOTATION_TERMINAL_EDIT_MESSAGE =
  "This quotation is linked to a project and cannot be edited. Clone it to create a new quotation, or change scope on the project.";

export const QUOTATION_RECONVERT_MESSAGE =
  "This quotation already created a project. Use Change requests or Additional work on that project for scope changes.";

/** Quotation has reached terminal converted state (status or legacy link). */
export function isQuotationTerminalConverted(q: Pick<Quotation, "status" | "linkedProjectId" | "convertedToProjectId">): boolean {
  return isQuotationConverted(q);
}

/** Whether field updates (other than blocked status transitions) are allowed. */
export function canEditQuotationFields(q: Quotation): boolean {
  return !isQuotationTerminalConverted(q);
}

export function rejectQuotationTerminalEdit(
  quotation: Quotation,
  updates: Partial<Quotation>,
): { ok: true } | { ok: false; code: "QUOTATION_TERMINAL"; message: string } {
  if (!isQuotationTerminalConverted(quotation)) return { ok: true };
  const keys = Object.keys(updates).filter(
    (k) => updates[k as keyof Quotation] !== undefined,
  );
  if (keys.length === 0) return { ok: true };
  return { ok: false, code: "QUOTATION_TERMINAL", message: QUOTATION_TERMINAL_EDIT_MESSAGE };
}

export function rejectSecondProjectFromQuotation(
  quotation: Quotation,
): { ok: true } | { ok: false; code: "QUOTATION_ALREADY_CONVERTED"; message: string } {
  if (!isQuotationTerminalConverted(quotation)) return { ok: true };
  const pid = quotationLinkedProjectId(quotation);
  return {
    ok: false,
    code: "QUOTATION_ALREADY_CONVERTED",
    message: pid
      ? `${QUOTATION_RECONVERT_MESSAGE} Linked project: ${pid}.`
      : QUOTATION_RECONVERT_MESSAGE,
  };
}

export const QUOTATION_DELETE_USE_WITHDRAW_MESSAGE =
  "This quotation cannot be deleted. Withdraw it to retire the quote while keeping history.";

export const QUOTATION_DELETE_LINKED_PROJECT_MESSAGE =
  "This quotation created a project and cannot be deleted. Use Change requests on the project for scope changes.";

export type QuotationDeleteBlockCode =
  | "LINKED_PROJECT"
  | "PROJECT_REFERENCE"
  | "INVOICE_LINKED"
  | "COMMISSION_ACCRUAL"
  | "ACTIVE_STATUS";

const DELETABLE_QUOTATION_STATUSES = new Set<QuotationStatus>(["draft", "rejected", "withdrawn"]);

export type QuotationDeleteContext = {
  projects: ReadonlyArray<{ id: string; quotationId?: string }>;
  accruals?: ReadonlyArray<Pick<AgentCommissionAccrual, "sourceQuotationId">>;
  invoices?: ReadonlyArray<Pick<Invoice, "quotationId">>;
};

/** Whether a quotation row may be permanently removed (MD8). */
export function canDeleteQuotationRecord(
  quotation: Quotation,
  ctx: QuotationDeleteContext,
): { ok: true } | { ok: false; code: QuotationDeleteBlockCode; message: string } {
  const linkedPid = quotationLinkedProjectId(quotation);
  if (linkedPid || quotation.status === "converted_to_project" || isQuotationTerminalConverted(quotation)) {
    return {
      ok: false,
      code: "LINKED_PROJECT",
      message: linkedPid
        ? `${QUOTATION_DELETE_LINKED_PROJECT_MESSAGE} (${linkedPid}).`
        : QUOTATION_DELETE_LINKED_PROJECT_MESSAGE,
    };
  }

  const projectRef = ctx.projects.find((p) => p.quotationId === quotation.id);
  if (projectRef) {
    return {
      ok: false,
      code: "PROJECT_REFERENCE",
      message: `Project ${projectRef.id} still references this quotation. Withdraw the quote instead of deleting.`,
    };
  }

  if (quotation.convertedToInvoiceId?.trim()) {
    return {
      ok: false,
      code: "INVOICE_LINKED",
      message: "This quotation was invoiced and cannot be deleted.",
    };
  }

  const hasAccrual = (ctx.accruals ?? []).some((a) => a.sourceQuotationId === quotation.id);
  if (hasAccrual) {
    return {
      ok: false,
      code: "COMMISSION_ACCRUAL",
      message: "Agent commission is accrued on this quotation. Withdraw it instead of deleting.",
    };
  }

  if (!DELETABLE_QUOTATION_STATUSES.has(quotation.status as QuotationStatus)) {
    return {
      ok: false,
      code: "ACTIVE_STATUS",
      message: QUOTATION_DELETE_USE_WITHDRAW_MESSAGE,
    };
  }

  return { ok: true };
}

/** Remove a deleted quotation id from enquiry quote history (does not touch projects). */
export function unlinkQuotationFromEnquiries<
  T extends { quotationId?: string; quotationIds?: string[] },
>(enquiries: T[], quotationId: string): T[] {
  return enquiries.map((enquiry) => {
    const ids = (enquiry.quotationIds ?? []).filter((qid) => qid !== quotationId);
    let nextQuotationId = enquiry.quotationId;
    if (enquiry.quotationId === quotationId) {
      nextQuotationId = ids.length > 0 ? ids[ids.length - 1] : undefined;
    }
    return {
      ...enquiry,
      quotationIds: ids.length > 0 ? ids : undefined,
      quotationId: nextQuotationId,
    };
  });
}
