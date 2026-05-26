import { canTransitionQuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import { getCurrentEnquiryQuotationId, getEnquiryQuotationIds } from "@/lib/enquiryQuotationHistory";
import type { Enquiry, Quotation } from "@/types/project";

export function getQuotationsLinkedToEnquiry(
  enquiry: Pick<Enquiry, "id" | "quotationId" | "quotationIds">,
  quotations: Quotation[],
): Quotation[] {
  const ids = new Set(getEnquiryQuotationIds(enquiry));
  return quotations.filter((q) => ids.has(q.id) || q.enquiryId === enquiry.id);
}

export function hasEnquirySentQuotationPipeline(
  enquiry: Pick<Enquiry, "id" | "quotationId" | "quotationIds">,
  quotations: Quotation[],
): boolean {
  return getQuotationsLinkedToEnquiry(enquiry, quotations).some(
    (q) =>
      q.status === "sent" ||
      q.status === "approved" ||
      q.status === "converted_to_project",
  );
}

/** Draft quotation to mark sent when enquiry moves to quotation_sent. */
export function pickQuotationToSendOnEnquiryMark(
  enquiry: Pick<Enquiry, "id" | "quotationId" | "quotationIds">,
  quotations: Quotation[],
): Quotation | undefined {
  const linked = getQuotationsLinkedToEnquiry(enquiry, quotations);
  if (linked.length === 0) return undefined;

  const currentId = getCurrentEnquiryQuotationId(enquiry);
  const preferred = currentId
    ? linked.find((q) => q.id === currentId)
    : linked[linked.length - 1];

  if (!preferred) return undefined;
  if (preferred.status === "sent" || preferred.status === "approved") return undefined;
  if (canTransitionQuotationStatus(preferred.status, "sent")) return preferred;
  return undefined;
}

export const ENQUIRY_SEND_QUOTATION_VALIDATION_MESSAGE =
  "Complete the linked quotation (client name, line items, amount, and payment type) before marking as sent.";
