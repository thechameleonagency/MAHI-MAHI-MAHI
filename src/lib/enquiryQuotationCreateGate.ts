import {
  canTransitionEnquiryStatus,
  type EnquiryStatus,
} from "@/domain/stateMachines/enquiryStateMachine";
import type { UserRole } from "@/domain/entities/identity";
import type { Enquiry } from "@/types/project";

/** Enquiry statuses that must not accept a new quotation (reopen first). */
export const ENQUIRY_TERMINAL_FOR_NEW_QUOTATION = new Set<EnquiryStatus>(["converted", "lost"]);

export type EnquiryQuotationCreateGateResult =
  | { ok: true; nextStatus: "quotation_sent" }
  | { ok: false; message: string };

/**
 * Whether a new quotation may be created and linked to this enquiry.
 * Uses the enquiry state machine — no direct status writes that bypass transitions.
 */
export function assertCanLinkNewQuotationToEnquiry(
  enquiry: Pick<Enquiry, "status">,
  actorRole: UserRole,
): EnquiryQuotationCreateGateResult {
  const status = enquiry.status as EnquiryStatus;

  if (ENQUIRY_TERMINAL_FOR_NEW_QUOTATION.has(status)) {
    if (status === "lost") {
      return {
        ok: false,
        message:
          "This enquiry is marked lost. Reopen it (admin) before creating a new quotation.",
      };
    }
    return {
      ok: false,
      message:
        "This enquiry is already converted. Create quotations from the customer or project instead.",
    };
  }

  if (!canTransitionEnquiryStatus(status, "quotation_sent", actorRole)) {
    return {
      ok: false,
      message: `Cannot link a new quotation while enquiry status is "${status.replace(/_/g, " ")}".`,
    };
  }

  return { ok: true, nextStatus: "quotation_sent" };
}

export function enquiryAllowsNewQuotation(enquiry: Pick<Enquiry, "status">): boolean {
  return assertCanLinkNewQuotationToEnquiry(enquiry, "admin").ok;
}
