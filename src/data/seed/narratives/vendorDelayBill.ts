import type { NarrativeApply } from "./shared";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import { seedDayAt, seedDateAt } from "../seedTimeModel";

export const applyVendorDelayBill: NarrativeApply = (state) => {
  const vendor = state.vendors[0];
  if (!vendor) return;
  state.vendorBills.push({
    id: seedId(SEED_ID_PREFIX.vendorBill),
    vendorId: vendor.id,
    vendorName: vendor.name,
    billNumber: "VB-2026-OVERDUE",
    billDate: seedDayAt(0.35),
    dueDate: "2026-05-01",
    items: [{ description: "Panel shipment delayed", quantity: 20, rate: 13200, amount: 264000 }],
    subtotal: 264000,
    gst: 47520,
    total: 311520,
    amountPaid: 0,
    status: "pending",
  });
};
