import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt, seedDateAt } from "../seedTimeModel";
import { clientPaymentRecordPaymentId } from "@/lib/clientPaymentReconciliation";

export const applyPartnerSplitPayment: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.partners?.length && p.projectKind === "PARTNER_EPC");
  if (!project) return;
  const amount = 85000;
  const cprId = seedId(SEED_ID_PREFIX.cpr);
  state.clientPaymentRecords.push({
    id: cprId,
    projectId: project.id,
    date: seedDayAt(0.57),
    amount,
    paymentMode: "neft",
    settlementRecipient: "split",
    splitLines: [
      { recipient: "company", amount: 51000 },
      { recipient: "partner", amount: 34000 },
    ],
    paymentStage: "milestone",
    recordedAt: seedDateAt(0.57),
    recordedBy: "Anita Deshmukh",
  });
  state.payments.push({
    id: clientPaymentRecordPaymentId(cprId),
    date: seedDayAt(0.57),
    amount,
    direction: "in",
    paymentMode: "Bank Transfer",
    counterpartyType: "customer",
    customerId: project.customerId,
    projectId: project.id,
    paymentSource: "split",
    partnerId: project.partners![0].partnerId,
    partnerPortion: 34000,
  });
};
