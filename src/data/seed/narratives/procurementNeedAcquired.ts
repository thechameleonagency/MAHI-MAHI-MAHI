import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";

/** FC9 — one procurement need line acquired with a linked vendor bill (continuity demo). */
export const applyProcurementNeedAcquired: NarrativeApply = (state) => {
  const line = state.procurementNeedLines.find((l) => l.status === "pending" && l.vendorId);
  if (!line) return;
  const bill = state.vendorBills.find((b) => String(b.vendorId) === String(line.vendorId));
  if (!bill) return;
  line.status = "acquired";
  line.acquiredAt = seedDateAt(0.72);
  line.acquiredQty = line.qtyNeeded;
  line.acquiredRate = line.lastPurchaseRate;
  line.vendorBillId = bill.id;
};
