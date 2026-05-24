import type { AppState } from "@/contexts/AppDataContext";
import { isOpenEnquiryAwaitingPipelineWinClosure } from "@/lib/enquiryConversionAtProjectWin";
import { getEnquiryQuotationIds } from "@/lib/enquiryQuotationHistory";
import type { Enquiry, Quotation } from "@/types/project";

export type StaleOpenEnquiryAfterProjectWin = {
  enquiryId: string;
  enquiryStatus: string;
  quotationId: string;
  quotationStatus: string;
};

/** Quotation states that should have closed the linked enquiry pipeline (FC1 / C1). */
export function quotationTriggersEnquiryConverted(quotation: Quotation): boolean {
  if (!quotation.enquiryId?.trim()) return false;
  if (quotation.status === "converted_to_project" && quotation.linkedProjectId) {
    return true;
  }
  if (quotation.status === "approved" && quotation.customerId?.trim()) {
    return true;
  }
  return false;
}

function isStaleOpenEnquiry(enquiry: Enquiry): boolean {
  if (enquiry.status === "converted" || enquiry.status === "lost" || enquiry.status === "quotation_rejected") {
    return false;
  }
  return isOpenEnquiryAwaitingPipelineWinClosure(enquiry.status);
}

/**
 * Enquiries still open after their quotation won (project created or approved with customer).
 * Empty after `convertLinkedEnquiryAfterProjectFromQuotation` + `reconcileEnquiriesConvertedOnProjectLink`.
 */
export function findStaleOpenEnquiriesAfterProjectWin(
  state: Pick<AppState, "enquiries" | "quotations">,
): StaleOpenEnquiryAfterProjectWin[] {
  const quotationById = new Map(state.quotations.map((q) => [q.id, q]));
  const stale = new Map<string, StaleOpenEnquiryAfterProjectWin>();

  const record = (enquiry: Enquiry, quotation: Quotation) => {
    if (!isStaleOpenEnquiry(enquiry)) return;
    stale.set(enquiry.id, {
      enquiryId: enquiry.id,
      enquiryStatus: enquiry.status,
      quotationId: quotation.id,
      quotationStatus: quotation.status,
    });
  };

  for (const quotation of state.quotations) {
    if (!quotationTriggersEnquiryConverted(quotation) || !quotation.enquiryId) continue;
    const enquiry = state.enquiries.find((e) => e.id === quotation.enquiryId);
    if (enquiry) record(enquiry, quotation);
  }

  for (const enquiry of state.enquiries) {
    if (!isStaleOpenEnquiry(enquiry)) continue;
    for (const quotationId of getEnquiryQuotationIds(enquiry)) {
      const quotation = quotationById.get(quotationId);
      if (quotation && quotationTriggersEnquiryConverted(quotation)) {
        record(enquiry, quotation);
      }
    }
  }

  return [...stale.values()];
}
