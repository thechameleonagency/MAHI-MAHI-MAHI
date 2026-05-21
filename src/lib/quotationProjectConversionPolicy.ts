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
import type { Quotation } from "@/types/project";

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
