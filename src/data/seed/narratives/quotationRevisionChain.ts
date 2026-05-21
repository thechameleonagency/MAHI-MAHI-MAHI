import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDateAt, seedDayAt } from "../seedTimeModel";
import { roundInr } from "../seedHelpers";

export const applyQuotationRevisionChain: NarrativeApply = (state) => {
  const base = state.quotations.find((q) => q.status === "sent" || q.status === "approved");
  if (!base) return;
  const enq = state.enquiries.find((e) => e.id === base.enquiryId);
  const rev1 = seedId(SEED_ID_PREFIX.quotation);
  const rev2 = seedId(SEED_ID_PREFIX.quotation);
  const chain = [
    { ...base, id: rev1, quotationNumber: `${base.quotationNumber}-R1`, revisionOfQuotationId: base.id, status: "rejected" as const, rejectedAt: seedDateAt(0.22) },
    { ...base, id: rev2, quotationNumber: `${base.quotationNumber}-R2`, revisionOfQuotationId: rev1, status: "approved" as const, approvedAt: seedDateAt(0.24), clientAgreedAmount: roundInr((base.clientAgreedAmount ?? base.totalAmount) * 0.97) },
  ];
  state.quotations.push(...chain);
  if (enq) {
    enq.quotationIds = [...(enq.quotationIds ?? []), rev1, rev2];
    enq.quotationId = rev2;
  }
};
