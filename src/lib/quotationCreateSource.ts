import { assertCanLinkNewQuotationToEnquiry } from "@/lib/enquiryQuotationCreateGate";
import type { UserRole } from "@/domain/entities/identity";
import type { Enquiry } from "@/types/project";

/** Minimum characters when creating a quotation without linking an enquiry (O1). */
export const MIN_QUOTATION_WITHOUT_ENQUIRY_REASON_LENGTH = 10;

export type QuotationCreateSourceInput = {
  enquiryId?: string | null;
  withoutEnquiryReason?: string | null;
};

export type QuotationCreateSourceResult =
  | { ok: true; mode: "enquiry"; enquiryId: string }
  | { ok: true; mode: "exception"; withoutEnquiryReason: string }
  | { ok: false; message: string };

/**
 * Validates how a new quotation entered the pipeline: either linked to an enquiry
 * (state-machine gate) or documented as an exception without enquiry.
 */
export function validateQuotationCreateSource(
  input: QuotationCreateSourceInput,
  enquiry: Pick<Enquiry, "status"> | null | undefined,
  actorRole: UserRole,
): QuotationCreateSourceResult {
  const enquiryTrim = input.enquiryId?.trim() ?? "";
  const reasonTrim = input.withoutEnquiryReason?.trim() ?? "";

  if (enquiryTrim && reasonTrim) {
    return {
      ok: false,
      message: "Choose either a linked enquiry or an exception reason — not both.",
    };
  }

  if (enquiryTrim) {
    if (!enquiry) {
      return { ok: false, message: "Selected enquiry was not found." };
    }
    const gate = assertCanLinkNewQuotationToEnquiry(enquiry, actorRole);
    if (!gate.ok) {
      return { ok: false, message: gate.message };
    }
    return { ok: true, mode: "enquiry", enquiryId: enquiryTrim };
  }

  if (reasonTrim.length < MIN_QUOTATION_WITHOUT_ENQUIRY_REASON_LENGTH) {
    return {
      ok: false,
      message: `Creating without an enquiry requires a reason (at least ${MIN_QUOTATION_WITHOUT_ENQUIRY_REASON_LENGTH} characters).`,
    };
  }

  if (!reasonTrim) {
    return {
      ok: false,
      message: "Link this quotation to an enquiry, or document why you are creating it without one.",
    };
  }

  return { ok: true, mode: "exception", withoutEnquiryReason: reasonTrim };
}

/** Enquiries eligible for the "from enquiry" path in the create gate. */
export function enquiriesEligibleForQuotationCreate(
  enquiries: Enquiry[],
  actorRole: UserRole,
): Enquiry[] {
  return enquiries.filter((e) => assertCanLinkNewQuotationToEnquiry(e, actorRole).ok);
}
