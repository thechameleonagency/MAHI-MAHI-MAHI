import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt } from "../seedTimeModel";
import { seedPushVendorBillWithBooks } from "../seedVendorBillBooks";

export const applyDisputedVendorBill: NarrativeApply = (state) => {
  const vendor = state.vendors.find((v) => v.outstandingAmount > 0) ?? state.vendors[0];
  const inverter =
    state.inventoryItems.find((i) => i.name?.toLowerCase().includes("inverter")) ?? state.inventoryItems[1];
  if (!vendor) return;
  seedPushVendorBillWithBooks(state, {
    id: seedId(SEED_ID_PREFIX.vendorBill),
    vendorId: vendor.id,
    vendorName: vendor.name,
    billNumber: "VB-2026-DISPUTED",
    billDate: seedDayAt(0.44),
    dueDate: seedDayAt(0.54),
    items: [
      {
        description: inverter?.name ?? "Inverter batch — qty mismatch",
        quantity: 5,
        rate: 38000,
        amount: 190000,
        ...(inverter ? { inventoryItemId: inverter.id } : {}),
      },
    ],
    subtotal: 190000,
    gst: 34200,
    total: 224200,
    amountPaid: 0,
    status: "disputed",
    notes: "Received 4 units; vendor insists 5 dispatched",
  });
};
