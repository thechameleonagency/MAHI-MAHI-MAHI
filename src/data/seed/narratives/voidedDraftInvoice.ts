import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt, seedDateAt } from "../seedTimeModel";

export const applyVoidedDraftInvoice: NarrativeApply = (state) => {
  const customer = state.customers.find((c) => !c.archivedAt);
  if (!customer) return;
  state.invoices.push(
    {
      id: seedId(SEED_ID_PREFIX.invoice),
      invoiceNumber: "INV-2026-DRAFT-1",
      type: "invoice",
      documentTypeSource: "user",
      customerId: customer.id,
      customerName: customer.name,
      items: [{ description: "Draft cancelled", hsn: "85414300", quantity: 1, rate: 50000, gstRate: 18 }],
      services: [],
      subtotal: 50000,
      cgst: 4500,
      sgst: 4500,
      igst: 0,
      total: 59000,
      status: "draft",
      invoiceDate: seedDayAt(0.4),
      dueDate: seedDayAt(0.5),
      createdAt: seedDateAt(0.4),
    },
    {
      id: seedId(SEED_ID_PREFIX.invoice),
      invoiceNumber: "INV-2026-VOID",
      type: "invoice",
      documentTypeSource: "user",
      customerId: customer.id,
      customerName: customer.name,
      items: [{ description: "Voided re-issue", hsn: "85414300", quantity: 1, rate: 75000, gstRate: 18 }],
      services: [],
      subtotal: 75000,
      cgst: 6750,
      sgst: 6750,
      igst: 0,
      total: 88500,
      status: "voided",
      invoiceDate: seedDayAt(0.42),
      dueDate: seedDayAt(0.52),
      createdAt: seedDateAt(0.42),
      notes: "Voided — duplicate billing error corrected",
    },
  );
};
