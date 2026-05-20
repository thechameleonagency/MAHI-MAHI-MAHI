/**
 * User-facing glossary for lifecycle actions (withdraw, reject, pipeline exceptions).
 * Keep copy here so tooltips, banners, and sheets stay aligned.
 */
export type LifecycleTermId =
  | "quotationWithdraw"
  | "quotationReject"
  | "quotationWithoutEnquiryException"
  | "quotationWithdrawVsReject"
  | "quotationQuotedTotal"
  | "quotationClientAgreedAmount";

export interface LifecycleTermEntry {
  title: string;
  summary: string;
  detail: string;
  whenToUse?: string;
}

export const LIFECYCLE_TERMINOLOGY: Record<LifecycleTermId, LifecycleTermEntry> = {
  quotationWithdraw: {
    title: "Withdraw quotation",
    summary: "Pull back your offer — without recording a client decline.",
    detail:
      "Withdraw locks the quotation from further edits and marks the offer as retracted on your side (pricing error, superseded quote, client went silent). Pipeline reports treat this separately from a client rejection.",
    whenToUse:
      "Use when you are stopping the quote internally. Use Reject when the customer formally declined.",
  },
  quotationReject: {
    title: "Reject quotation",
    summary: "Record that the client or commercial decision declined this offer.",
    detail:
      "Reject is a terminal sales outcome: the customer said no, or you closed the deal as lost after discussion. It is not the same as withdrawing an offer you are retracting yourself.",
    whenToUse:
      "Use after the client declines or you mark the deal lost. Use Withdraw if you are retracting the offer without a formal client no.",
  },
  quotationWithoutEnquiryException: {
    title: "Quote without enquiry (exception)",
    summary: "Start a quotation outside the normal enquiry → quotation pipeline.",
    detail:
      "MSS expects an enquiry first. When that is impossible (repeat customer call, enquiry closed in error, urgent add-on), choose this path and document why. The reason is stored on the quotation for audit.",
    whenToUse: "Only when no suitable open enquiry exists — not as a shortcut to skip lead capture.",
  },
  quotationWithdrawVsReject: {
    title: "Withdraw vs Reject",
    summary: "Withdraw = you retract the offer. Reject = the client or deal declined.",
    detail:
      "Both lock the quotation and keep it in history. Neither deletes the record. Clone either one to start a fresh draft. Dashboards and reports count withdrawn and rejected quotes separately.",
    whenToUse:
      "Withdraw for internal retraction; Reject for a lost or declined deal.",
  },
  quotationQuotedTotal: {
    title: "Quoted total",
    summary: "The full price on the quotation document (GST-inclusive, after subsidy).",
    detail:
      "Calculated from line items, discount, GST, and government subsidy. Stored as totalAmount and shown on PDFs and client-facing previews.",
    whenToUse: "This is what you quoted — before any final negotiation.",
  },
  quotationClientAgreedAmount: {
    title: "Client agreed amount",
    summary: "What the client will actually pay — used as the project contract when set.",
    detail:
      "When negotiation changes the price (e.g. extra discount), enter the agreed figure here. Project conversion and contract amount use clientAgreedAmount first, then fall back to quoted total.",
    whenToUse:
      "Leave blank to match the quoted total. Fill in only when the agreed price differs from the quote on paper.",
  },
};

export function getLifecycleTerm(term: LifecycleTermId): LifecycleTermEntry {
  return LIFECYCLE_TERMINOLOGY[term];
}

/** One-line helper for terminal banners and sheet intros. */
export function lifecycleTermSummary(term: LifecycleTermId): string {
  return getLifecycleTerm(term).summary;
}
