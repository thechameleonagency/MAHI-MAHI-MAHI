import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt, seedDateAt } from "../seedTimeModel";

export const applyDisputedVendorBill: NarrativeApply = (state) => {
  const vendor = state.vendors.find((v) => v.outstandingAmount > 0) ?? state.vendors[0];
  if (!vendor) return;
  state.vendorBills.push({
    id: seedId(SEED_ID_PREFIX.vendorBill),
    vendorId: vendor.id,
    vendorName: vendor.name,
    billNumber: "VB-2026-DISPUTED",
    billDate: seedDayAt(0.44),
    dueDate: seedDayAt(0.54),
    items: [{ description: "Inverter batch — qty mismatch", quantity: 5, rate: 38000, amount: 190000 }],
    subtotal: 190000,
    gst: 34200,
    total: 224200,
    amountPaid: 0,
    status: "disputed",
    notes: "Received 4 units; vendor insists 5 dispatched",
  });
};
