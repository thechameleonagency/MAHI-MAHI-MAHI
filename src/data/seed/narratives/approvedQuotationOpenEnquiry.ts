import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";

/**
 * MD1 — deliberate mismatch before hydration: approved quote + open enquiry.
 * `reconcileEnquiriesConvertedOnProjectLink` closes the enquiry on seed load.
 */
export const applyApprovedQuotationOpenEnquiry: NarrativeApply = (state) => {
  const quotation = state.quotations.find(
    (q) => q.status === "approved" && q.enquiryId && q.customerId,
  );
  if (!quotation?.enquiryId) return;

  const enquiry = state.enquiries.find((e) => e.id === quotation.enquiryId);
  if (!enquiry || enquiry.status === "converted" || enquiry.status === "lost") return;

  enquiry.status = "quotation_sent";
  enquiry.customerId = quotation.customerId ?? enquiry.customerId;
  enquiry.updatedAt = seedDateAt(0.76);
};
