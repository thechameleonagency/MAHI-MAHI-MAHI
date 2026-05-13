import type { UserRole } from "@/domain/entities/identity";

export type EnquiryStatus = "new" | "contacted" | "meeting-scheduled" | "quotation-sent" | "converted" | "lost";

const baseTransitions: Record<EnquiryStatus, EnquiryStatus[]> = {
  new: ["contacted", "lost"],
  contacted: ["meeting-scheduled", "quotation-sent", "converted", "lost"],
  "meeting-scheduled": ["quotation-sent", "converted", "lost"],
  "quotation-sent": ["converted", "lost"],
  converted: [],
  lost: [],
};

export const canTransitionEnquiryStatus = (
  from: EnquiryStatus,
  to: EnquiryStatus,
  actorRole: UserRole,
  reason?: string,
): boolean => {
  if (from === "lost" && to === "contacted") {
    return ["super_admin", "admin"].includes(actorRole) && Boolean(reason?.trim());
  }

  return baseTransitions[from].includes(to);
};
