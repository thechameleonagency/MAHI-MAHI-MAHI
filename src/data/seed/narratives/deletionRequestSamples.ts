import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { collectRelatedEntitiesForDeletion } from "@/lib/deletionRequestContinuity";

/** ER7 — sample deletion requests wired to real seeded entities. */
export const applyDeletionRequestSamples: NarrativeApply = (state) => {
  const withdrawn = state.quotations.find((q) => q.status === "withdrawn");
  const rejected = state.quotations.find((q) => q.status === "rejected");
  const draft = state.quotations.find((q) => q.status === "draft");
  const salesperson = state.employees.find((e) => e.role.toLowerCase().includes("sales"));

  if (withdrawn) {
    const id = seedId(SEED_ID_PREFIX.deletionRequest);
    state.deletionRequests.push({
      id,
      entityType: "quotation",
      entityId: withdrawn.id,
      entityName: withdrawn.quotationNumber ?? withdrawn.id,
      reason: "Client requested removal from active pipeline after withdrawal",
      responsiblePerson: salesperson?.name,
      responsiblePersonId: salesperson?.id,
      requestedBy: salesperson?.name ?? "Karthik Rao",
      requestedAt: seedDateAt(0.2),
      status: "approved",
      approvedBy: "Anita Deshmukh",
      approvedAt: seedDateAt(0.22),
      relatedEntities: collectRelatedEntitiesForDeletion(state, "quotation", withdrawn.id),
    });
  }

  if (rejected) {
    const id = seedId(SEED_ID_PREFIX.deletionRequest);
    state.deletionRequests.push({
      id,
      entityType: "quotation",
      entityId: rejected.id,
      entityName: rejected.quotationNumber ?? rejected.id,
      reason: "Duplicate quote created in error — safe to purge after rejection",
      requestedBy: "Karthik Rao",
      requestedAt: seedDateAt(0.18),
      status: "rejected",
      approvedBy: "Anita Deshmukh",
      approvedAt: seedDateAt(0.19),
      rejectionReason: "Retain rejected quotes for pipeline analytics",
      relatedEntities: collectRelatedEntitiesForDeletion(state, "quotation", rejected.id),
    });
  }

  if (draft) {
    const id = seedId(SEED_ID_PREFIX.deletionRequest);
    state.deletionRequests.push({
      id,
      entityType: "quotation",
      entityId: draft.id,
      entityName: draft.quotationNumber ?? draft.id,
      reason: "Test draft entered on wrong customer — pending admin purge",
      requestedBy: "Karthik Rao",
      requestedAt: seedDateAt(0.4),
      status: "pending",
      relatedEntities: collectRelatedEntitiesForDeletion(state, "quotation", draft.id),
    });
  }
};
