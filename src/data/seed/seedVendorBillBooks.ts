import type { AppState } from "@/contexts/AppDataContext";
import { vendorBillInventoryReceiptLines } from "@/lib/vendorBillInventoryLinkage";
import {
  isVendorBillBookable,
  postVendorBillVoucher,
} from "@/lib/vendorBillVoucherPosting";
import type { VendorBill } from "@/types/inventory";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDateAt } from "./seedTimeModel";

function makeSeedReviewItem(bill: VendorBill, reason: string) {
  return {
    id: seedId(SEED_ID_PREFIX.reviewQueue),
    reason,
    eventType: "PurchaseBillBooked" as const,
    sourceDocumentId: bill.id,
    projectId: bill.projectId,
    amount: bill.total,
    createdAt: seedDateAt(0.5),
  };
}

/** Apply warehouse receipt for bill lines linked to inventory (mirrors live PurchaseIn). */
export function seedApplyVendorBillInventoryReceipt(state: AppState, bill: VendorBill): void {
  for (const line of bill.items ?? []) {
    const itemId = line.inventoryItemId;
    const qty = Number(line.quantity);
    if (!itemId || !Number.isFinite(qty) || qty <= 0) continue;
    const item = state.inventoryItems.find((i) => i.id === itemId);
    if (!item) continue;
    item.stock = (item.stock ?? 0) + qty;
    const history = item.movementHistory ?? [];
    history.push({
      id: seedId("MOV"),
      type: "purchase",
      qty,
      date: bill.billDate,
      notes: `Vendor bill ${bill.billNumber}`,
      createdAt: seedDateAt(0.5),
    });
    item.movementHistory = history;
  }
}

/** Push vendor bill and book to GL when operational (FC4 / C2 seed parity with live UI). */
export function seedPushVendorBillWithBooks(state: AppState, bill: VendorBill): VendorBill {
  state.vendorBills.push(bill);
  if (isVendorBillBookable(bill.status)) {
    const posting = postVendorBillVoucher(bill);
    if (posting?.ok) {
      state.accountingVouchers.push(posting.voucher);
    } else if (posting && !posting.ok) {
      state.accountingReviewQueue.push(makeSeedReviewItem(bill, posting.reviewQueueItem.reason));
    }
  }
  seedApplyVendorBillInventoryReceipt(state, bill);
  bill.warehouseReceiptApplied = vendorBillInventoryReceiptLines(bill).length > 0 ? true : bill.warehouseReceiptApplied;
  return bill;
}
