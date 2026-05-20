import type { EnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";

/** Minimum length for enquiry terminal transitions (mark lost after quote) and reopen (lost → new). */
export const MIN_ENQUIRY_TERMINAL_REASON_LENGTH = 10;

export function trimEnquiryReason(reason?: string): string {
  return reason?.trim() ?? "";
}

export function isEnquiryTerminalReasonValid(reason?: string): boolean {
  return trimEnquiryReason(reason).length >= MIN_ENQUIRY_TERMINAL_REASON_LENGTH;
}

export function enquiryTerminalReasonRequiredMessage(): string {
  return `Provide a reason (at least ${MIN_ENQUIRY_TERMINAL_REASON_LENGTH} characters).`;
}

/** Transitions that require a validated terminal/reopen reason string. */
export function enquiryTransitionRequiresTerminalReason(
  from: EnquiryStatus,
  to: EnquiryStatus,
): boolean {
  if (from === "lost" && to === "new") return true;
  if ((from === "quotation_sent" || from === "quotation_rejected") && to === "lost") {
    return true;
  }
  return false;
}
