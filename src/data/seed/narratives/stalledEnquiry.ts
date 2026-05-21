import type { NarrativeApply } from "./shared";
import { seedDateAt, seedDayAt } from "../seedTimeModel";

export const applyStalledEnquiry: NarrativeApply = (state) => {
  const enq = state.enquiries.find((e) => e.status === "quotation_sent");
  if (!enq) return;
  enq.followUpDate = "2026-05-01";
  enq.updatedAt = seedDateAt(0.75);
  const q = state.quotations.find((x) => x.enquiryId === enq.id);
  if (q) {
    q.status = "sent";
    q.sentAt = seedDateAt(0.55);
  }
};
