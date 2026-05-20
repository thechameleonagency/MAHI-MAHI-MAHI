import type { UserRole } from "@/domain/entities/identity";

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

export const canTransitionEnquiryStatus = (
  from: EnquiryStatus,
  to: EnquiryStatus,
  actorRole: UserRole,
  reason?: string,
): boolean => {
  // Admins/super-admins can reopen lost enquiries back to "new" with a reason.
  if (from === "lost" && to === "new") {
    return ["super_admin", "admin"].includes(actorRole) && Boolean(reason?.trim());
  }

  if ((from === "quotation_sent" || from === "quotation_rejected") && to === "lost") {
    return (reason?.trim().length ?? 0) >= 3;
  }

  return baseTransitions[from]?.includes(to) ?? false;
};
