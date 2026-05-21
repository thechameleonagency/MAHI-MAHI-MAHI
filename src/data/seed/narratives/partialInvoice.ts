import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt, seedDateAt } from "../seedTimeModel";
import { gstBreakup } from "../L8_crm";

export const applyPartialInvoice: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "In Progress");
  if (!project?.customerId) return;
  const total = Math.round(project.contractAmount * 0.45);
  const gst = gstBreakup(total);
  state.invoices.push({
    id: seedId(SEED_ID_PREFIX.invoice),
    invoiceNumber: "INV-2026-PARTIAL",
    type: "invoice",
    documentTypeSource: "user",
    customerId: project.customerId,
    customerName: project.client,
    projectId: project.id,
    projectName: project.name,
    items: [{ description: "Milestone 1 billing", hsn: "85414300", quantity: 1, rate: gst.subtotal, gstRate: 18 }],
    services: [],
    subtotal: gst.subtotal,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: 0,
    total: gst.total,
    amountReceived: gst.total * 0.35,
    status: "partial",
    invoiceDate: seedDayAt(0.58),
    dueDate: seedDayAt(0.68),
    createdAt: seedDateAt(0.58),
  });
};
