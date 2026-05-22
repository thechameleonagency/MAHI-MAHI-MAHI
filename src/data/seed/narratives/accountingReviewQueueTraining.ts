import type { NarrativeApply } from "./shared";
import { seedDayAt, seedDateAt } from "../seedTimeModel";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { gstBreakup } from "../L8_crm";

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
  if (!project?.customerId) return;

  let invoice = state.invoices.find(
    (i) => i.projectId === project.id && i.status !== "voided" && i.status !== "draft",
  );

  if (!invoice) {
    const total = Math.round((project.contractAmount ?? 200000) * 0.45);
    const gst = gstBreakup(total);
    invoice = {
      id: seedId(SEED_ID_PREFIX.invoice),
      invoiceNumber: "INV-2026-TRAINING",
      type: "invoice",
      documentTypeSource: "user",
      customerId: project.customerId,
      customerName: project.client,
      projectId: project.id,
      projectName: project.name,
      items: [{ description: "Training sample milestone billing", hsn: "85414300", quantity: 1, rate: gst.subtotal, gstRate: 18 }],
      services: [],
      subtotal: gst.subtotal,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: 0,
      total: gst.total,
      amountReceived: 0,
      status: "pending",
      invoiceDate: seedDayAt(0.58),
      dueDate: seedDayAt(0.68),
      createdAt: seedDateAt(0.58),
    };
    state.invoices.push(invoice);
    project.invoiceIds = [...(project.invoiceIds ?? []), invoice.id];
    project.invoiceId = invoice.id;
    project.amountInvoiced = (project.amountInvoiced ?? 0) + invoice.total;
  }

  const existing = state.accountingReviewQueue.find(
    (q) => q.sourceDocumentId === invoice!.id && q.eventType === "InvoiceIssued",
  );
  if (existing) {
    existing.reason = "Training sample: auto-post failed — retry mapping or dismiss after manual books fix";
    existing.projectId = project.id;
    existing.amount = invoice.total ?? 0;
    return;
  }

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
