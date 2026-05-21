import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt, seedDateAt } from "../seedTimeModel";
import { gstBreakup } from "../L8_crm";

export const applyVendorshipOnlyFee: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.projectKind === "VENDORSHIP_ONLY");
  if (!project?.customerId) return;
  const fee = project.vendorshipFeeReceivable ?? 85000;
  const gst = gstBreakup(fee);
  state.invoices.push({
    id: seedId(SEED_ID_PREFIX.invoice),
    invoiceNumber: "INV-2026-VSHIP",
    type: "invoice",
    documentTypeSource: "user",
    customerId: project.customerId,
    customerName: project.client,
    projectId: project.id,
    projectName: project.name,
    items: [{ description: "Vendorship code facilitation fee", hsn: "998719", quantity: 1, rate: gst.subtotal, gstRate: 18 }],
    services: [],
    subtotal: gst.subtotal,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: 0,
    total: gst.total,
    status: "pending",
    invoiceDate: seedDayAt(0.5),
    dueDate: seedDayAt(0.6),
    createdAt: seedDateAt(0.5),
  });
};
