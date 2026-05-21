import type { NarrativeApply } from "./shared";
import { pushAudit } from "../seedHelpers";
import { seedDayAt, seedDateAt } from "../seedTimeModel";

export const applyReopenLostEnquiry: NarrativeApply = (state) => {
  const lost = state.enquiries.find((e) => e.status === "lost");
  if (!lost) return;
  lost.status = "new";
  lost.lostReason = undefined;
  lost.notes.push({ date: seedDayAt(0.8), note: "Reopened by admin — client re-engaged after festival", by: "Rajesh Kulkarni", updatedBy: "SA-001" });
  lost.updatedAt = seedDateAt(0.8);
  pushAudit(state, { action: "update", entityType: "Enquiry", entityId: lost.id, entityName: lost.customerName, fraction: 0.81, role: "super_admin", field: "enquiry:create", oldValue: "lost", newValue: "new" });
};
