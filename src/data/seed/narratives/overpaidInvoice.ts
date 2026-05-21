import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt, seedDateAt } from "../seedTimeModel";
import { gstBreakup } from "../L8_crm";

export const applyOverpaidInvoice: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.lifecycleStatus === "Completed");
  if (!project?.customerId) return;
  const total = Math.round(project.contractAmount * 0.2);
  const gst = gstBreakup(total);
  state.invoices.push({
    id: seedId(SEED_ID_PREFIX.invoice),
    invoiceNumber: "INV-2026-OVERPAID",
    type: "invoice",
    documentTypeSource: "user",
    customerId: project.customerId,
    customerName: project.client,
    projectId: project.id,
    projectName: project.name,
    items: [{ description: "Final balance", hsn: "85414300", quantity: 1, rate: gst.subtotal, gstRate: 18 }],
    services: [],
    subtotal: gst.subtotal,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: 0,
    total: gst.total,
    amountReceived: gst.total * 1.08,
    status: "overpaid",
    invoiceDate: seedDayAt(0.72),
    dueDate: seedDayAt(0.75),
    createdAt: seedDateAt(0.72),
  });
};
