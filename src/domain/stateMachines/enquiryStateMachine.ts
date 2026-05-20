import type { UserRole } from "@/domain/entities/identity";
import {
  enquiryTransitionRequiresTerminalReason,
  isEnquiryTerminalReasonValid,
} from "@/lib/enquiryReasonValidation";

export type EnquiryStatus =
  | "new"
  | "meeting_scheduled"
  | "quotation_sent"
  | "quotation_rejected"
  | "converted"
  | "lost";

const baseTransitions: Record<EnquiryStatus, EnquiryStatus[]> = {
  new: ["meeting_scheduled", "quotation_sent", "lost"],
  meeting_scheduled: ["quotation_sent", "lost"],
  quotation_sent: ["converted", "lost", "quotation_rejected"],
  quotation_rejected: ["quotation_sent", "lost"],
  converted: [],
  lost: [],
};

/** Lost → new reopen is restricted to admin / super_admin (UI should gate before opening the sheet). */
export function canReopenLostEnquiry(actorRole: UserRole): boolean {
  return actorRole === "super_admin" || actorRole === "admin";
}

export const canTransitionEnquiryStatus = (
  from: EnquiryStatus,
  to: EnquiryStatus,
  actorRole: UserRole,
  reason?: string,
): boolean => {
  if (enquiryTransitionRequiresTerminalReason(from, to)) {
    if (from === "lost" && to === "new") {
      return canReopenLostEnquiry(actorRole) && isEnquiryTerminalReasonValid(reason);
    }
    return isEnquiryTerminalReasonValid(reason);
  }

  return baseTransitions[from]?.includes(to) ?? false;
};
