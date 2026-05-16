import type { UserRole } from "@/domain/entities/identity";

export type EnquiryStatus = "new" | "contacted" | "meeting-scheduled" | "quotation-sent" | "converted" | "lost";

const baseTransitions: Record<EnquiryStatus, EnquiryStatus[]> = {
  new: ["contacted", "lost"],
  contacted: ["meeting-scheduled", "quotation-sent", "converted", "lost"],
  "meeting-scheduled": ["quotation-sent", "converted", "lost"],
  "quotation-sent": ["converted", "lost"],
  converted: [],
  lost: [], // Admin/super_admin can reopen lost enquiries via the explicit override below
};

export const canTransitionEnquiryStatus = (
  from: EnquiryStatus,
  to: EnquiryStatus,
  actorRole: UserRole,
  reason?: string,
): boolean => {
  // Intentional rescue path: admins can reopen lost enquiries to re-engage the lead
  if (from === "lost" && to === "contacted") {
    return ["super_admin", "admin"].includes(actorRole) && Boolean(reason?.trim());
  }

  if (from === "quotation-sent" && to === "lost") {
    return (reason?.trim().length ?? 0) >= 3;
  }

  return baseTransitions[from].includes(to);
};
