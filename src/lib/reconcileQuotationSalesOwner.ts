import type { AppState } from "@/contexts/AppDataContext";
import type { Quotation } from "@/types/project";

/** Backfill quotation.salesOwnerMemberId from linked enquiry assignee (seed + persisted stores). */
export function reconcileQuotationSalesOwners(quotations: Quotation[], enquiries: AppState["enquiries"]): Quotation[] {
  const enquiryById = new Map(enquiries.map((e) => [e.id, e]));
  let changed = false;
  const next = quotations.map((q) => {
    if (q.salesOwnerMemberId?.trim()) return q;
    if (!q.enquiryId) return q;
    const enquiry = enquiryById.get(q.enquiryId);
    const owner = enquiry?.assignedToMemberId?.trim();
    if (!owner) return q;
    changed = true;
    return { ...q, salesOwnerMemberId: owner };
  });
  return changed ? next : quotations;
}

export function reconcileQuotationSalesOwnerState(state: AppState): AppState {
  const quotations = reconcileQuotationSalesOwners(state.quotations, state.enquiries);
  if (quotations === state.quotations) return state;
  return { ...state, quotations };
}

export type StaleQuotationSalesOwner = {
  quotationId: string;
  enquiryId: string;
  reason: "missing_owner_with_enquiry_assignee";
};

/** Linked enquiry quotes should carry salesOwnerMemberId after hydrate (V5). */
export function findStaleQuotationSalesOwners(state: AppState): StaleQuotationSalesOwner[] {
  const stale: StaleQuotationSalesOwner[] = [];
  const enquiryById = new Map(state.enquiries.map((e) => [e.id, e]));
  for (const q of state.quotations) {
    if (q.salesOwnerMemberId?.trim() || !q.enquiryId) continue;
    const enquiry = enquiryById.get(q.enquiryId);
    if (!enquiry?.assignedToMemberId?.trim()) continue;
    stale.push({
      quotationId: q.id,
      enquiryId: q.enquiryId,
      reason: "missing_owner_with_enquiry_assignee",
    });
  }
  return stale;
}
