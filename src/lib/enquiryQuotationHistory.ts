import type { Enquiry, Quotation } from "@/types/project";

/** Append-only quotation ids linked to an enquiry (oldest → newest). */
export function getEnquiryQuotationIds(enquiry: Pick<Enquiry, "quotationId" | "quotationIds">): string[] {
  const fromArray = enquiry.quotationIds?.filter(Boolean) ?? [];
  if (fromArray.length > 0) {
    return fromArray;
  }
  return enquiry.quotationId ? [enquiry.quotationId] : [];
}

/** Latest quotation on the enquiry (current active quote). */
export function getCurrentEnquiryQuotationId(
  enquiry: Pick<Enquiry, "quotationId" | "quotationIds">,
): string | undefined {
  const ids = getEnquiryQuotationIds(enquiry);
  return ids.length > 0 ? ids[ids.length - 1] : undefined;
}

/** Fields to persist when linking a new quotation to an enquiry. */
export function buildEnquiryQuotationLinkUpdate(
  enquiry: Pick<Enquiry, "quotationId" | "quotationIds">,
  newQuotationId: string,
): Pick<Enquiry, "quotationId" | "quotationIds"> {
  const existing = getEnquiryQuotationIds(enquiry);
  const quotationIds = existing.includes(newQuotationId)
    ? existing
    : [...existing, newQuotationId];
  return {
    quotationId: newQuotationId,
    quotationIds,
  };
}

function quotationSortKey(q: Quotation): string {
  return q.createdAt || q.sentAt || q.approvedAt || "";
}

/**
 * Hydrate `quotationIds` from linked quotations + legacy `quotationId`.
 * Keeps `quotationId` aligned to the chronologically latest quote.
 */
export function reconcileEnquiryQuotationHistory(
  enquiry: Enquiry,
  allQuotations: Quotation[],
): Enquiry {
  const linked = allQuotations
    .filter((q) => q.enquiryId === enquiry.id)
    .sort((a, b) => quotationSortKey(a).localeCompare(quotationSortKey(b)));

  const ordered: string[] = [];
  const push = (id: string | undefined) => {
    if (id && !ordered.includes(id)) ordered.push(id);
  };

  for (const q of linked) {
    push(q.id);
  }
  for (const id of enquiry.quotationIds ?? []) {
    push(id);
  }
  push(enquiry.quotationId);

  if (ordered.length === 0) {
    return { ...enquiry, quotationId: undefined, quotationIds: undefined };
  }

  return {
    ...enquiry,
    quotationIds: ordered,
    quotationId: ordered[ordered.length - 1],
  };
}

export function reconcileAllEnquiryQuotationHistories(
  enquiries: Enquiry[],
  quotations: Quotation[],
): Enquiry[] {
  return enquiries.map((e) => reconcileEnquiryQuotationHistory(e, quotations));
}
