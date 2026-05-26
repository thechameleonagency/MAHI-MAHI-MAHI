import type { EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import {
  getQuotationsLinkedToEnquiry,
  hasEnquirySentQuotationPipeline,
} from "@/lib/enquirySendQuotation";
import type { Enquiry, Quotation } from "@/types/project";

const TERMINAL: EnquiryStatus[] = ["converted", "lost"];

/**
 * Enquiry must not stay `quotation_sent` while every linked quote is still draft.
 * Returns corrected status (may equal input when already consistent).
 */
export function deriveEnquiryStatusFromQuotations(
  enquiry: Enquiry,
  quotations: Quotation[],
): EnquiryStatus {
  const status = enquiry.status as EnquiryStatus;
  if (TERMINAL.includes(status)) return status;
  if (status === "quotation_rejected") return status;

  const linked = getQuotationsLinkedToEnquiry(enquiry, quotations);
  const hasSentPipeline = hasEnquirySentQuotationPipeline(enquiry, quotations);

  if (status === "quotation_sent" && linked.length > 0 && !hasSentPipeline) {
    if (enquiry.meetingDate?.trim()) return "meeting_scheduled";
    return "new";
  }

  if (
    (status === "new" || status === "meeting_scheduled") &&
    linked.length > 0 &&
    hasSentPipeline
  ) {
    return "quotation_sent";
  }

  return status;
}

export function reconcileEnquiryStatusesFromQuotations(
  enquiries: Enquiry[],
  quotations: Quotation[],
): Enquiry[] {
  return enquiries.map((enquiry) => {
    const derived = deriveEnquiryStatusFromQuotations(enquiry, quotations);
    if (derived === enquiry.status) return enquiry;
    return {
      ...enquiry,
      status: derived,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  });
}

/** Status label key for UI — includes display-only draft phase. */
export function getEnquiryDisplayStatus(
  enquiry: Enquiry,
  quotations: Quotation[],
): EnquiryStatus | "quotation_draft" {
  const reconciled = deriveEnquiryStatusFromQuotations(enquiry, quotations);
  if (reconciled === "quotation_sent") {
    return "quotation_sent";
  }

  const linked = getQuotationsLinkedToEnquiry(enquiry, quotations);
  const hasDraftOnly =
    linked.length > 0 &&
    !hasEnquirySentQuotationPipeline(enquiry, quotations) &&
    linked.some((q) => q.status === "draft");

  if (
    hasDraftOnly &&
    (reconciled === "new" || reconciled === "meeting_scheduled" || reconciled === "quotation_rejected")
  ) {
    return "quotation_draft";
  }
  return reconciled;
}
