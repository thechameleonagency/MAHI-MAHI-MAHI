import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt, seedDateAt } from "../seedTimeModel";

export const applyHighValueInvoice: NarrativeApply = (state) => {
  const project = state.projects.find((p) => p.contractAmount > 100000);
  if (!project?.customerId) return;
  const total = Math.round(project.contractAmount * 1.15);
  state.invoices.push({
    id: seedId(SEED_ID_PREFIX.invoice),
    invoiceNumber: "INV-2026-HIGH",
    type: "invoice",
    documentTypeSource: "user",
    customerId: project.customerId,
    customerName: project.client,
    projectId: project.id,
    projectName: project.name,
    items: [{ description: "Phase 2 capacity upgrade", hsn: "85414300", quantity: 1, rate: total / 1.18, gstRate: 18 }],
    services: [],
    subtotal: total / 1.18,
    cgst: (total - total / 1.18) / 2,
    sgst: (total - total / 1.18) / 2,
    igst: 0,
    total,
    status: "pending",
    invoiceDate: seedDayAt(0.78),
    dueDate: seedDayAt(0.85),
    createdAt: seedDateAt(0.78),
    notes: "HIGH_VALUE_JUSTIFICATION: Client-approved change order for additional 10kW row",
  });
};
