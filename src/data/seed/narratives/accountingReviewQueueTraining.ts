import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";

/**
 * EC1 — one queue row explicitly tied to an in-progress EPC project (via invoice link)
 * so Finance dismiss/retry training and completion help text have a real example.
 */
export const applyAccountingReviewQueueTraining: NarrativeApply = (state) => {
  const project = state.projects.find(
    (p) =>
      p.lifecycleStatus === "In Progress" &&
      p.projectKind === "SOLO_EPC" &&
      !p.name.includes("[Demo]"),
  );
  if (!project) return;

  const invoice = state.invoices.find(
    (i) => i.projectId === project.id && i.status !== "voided" && i.status !== "draft",
  );
  if (!invoice) return;

  const already = state.accountingReviewQueue.some(
    (q) => q.sourceDocumentId === invoice.id && q.eventType === "InvoiceIssued",
  );
  if (already) return;

  state.accountingReviewQueue.push({
    id: seedId(SEED_ID_PREFIX.reviewQueue),
    reason: "Training sample: auto-post failed — retry mapping or dismiss after manual books fix",
    eventType: "InvoiceIssued",
    sourceDocumentId: invoice.id,
    projectId: project.id,
    amount: invoice.total ?? 0,
    createdAt: seedDateAt(0.58),
  });
};
