/**
 * Structured enquiry lost/rejection reasons so Business Analytics can chart
 * why leads are lost instead of parsing free text.
 */
export type EnquiryLostReasonCode =
  | "price_too_high"
  | "already_got_solar"
  | "chose_competitor"
  | "no_response"
  | "financing_unavailable"
  | "postponed"
  | "other";

export const ENQUIRY_LOST_REASON_LABELS: Record<EnquiryLostReasonCode, string> = {
  price_too_high: "Price / amount too high",
  already_got_solar: "Already got solar",
  chose_competitor: "Chose another competitor",
  no_response: "No response from customer",
  financing_unavailable: "Financing not available",
  postponed: "Postponed decision",
  other: "Other",
};

export const ENQUIRY_LOST_REASON_CODES = Object.keys(
  ENQUIRY_LOST_REASON_LABELS,
) as EnquiryLostReasonCode[];

export function getEnquiryLostReasonLabel(code: string | undefined): string {
  if (code && code in ENQUIRY_LOST_REASON_LABELS) {
    return ENQUIRY_LOST_REASON_LABELS[code as EnquiryLostReasonCode];
  }
  return "Other / unspecified";
}

/**
 * Analytics grouping key for a lost enquiry. Legacy records that only carry
 * free-text `lostReason` (or nothing) group under "unspecified".
 */
export function lostReasonGroupKey(enquiry: {
  lostReasonCode?: string;
  lostReason?: string;
}): EnquiryLostReasonCode | "unspecified" {
  if (enquiry.lostReasonCode && enquiry.lostReasonCode in ENQUIRY_LOST_REASON_LABELS) {
    return enquiry.lostReasonCode as EnquiryLostReasonCode;
  }
  return "unspecified";
}
