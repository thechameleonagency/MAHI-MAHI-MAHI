import type { AppState } from "@/contexts/AppDataContext";
import {
  hasPurchaseBillBookedVoucher,
  isVendorBillBookable,
} from "@/lib/vendorBillVoucherPosting";
import type { VendorBill } from "@/types/inventory";

export type StaleVendorBillBooks = {
  vendorBillId: string;
  billNumber: string;
  status: VendorBill["status"];
  reason: "missing_purchase_bill_voucher";
};

const PURCHASE_BILL_EVENT = "PurchaseBillBooked";

/** Bookable vendor bills must have PurchaseBillBooked in vouchers or an open review queue item. */
export function findStaleVendorBillBooks(state: AppState): StaleVendorBillBooks[] {
  const stale: StaleVendorBillBooks[] = [];
  for (const bill of state.vendorBills) {
    if (!isVendorBillBookable(bill.status)) continue;
    if (hasPurchaseBillBookedVoucher(state.accountingVouchers, bill.id)) continue;
    if (
      state.accountingReviewQueue.some(
        (q) => q.sourceDocumentId === bill.id && q.eventType === PURCHASE_BILL_EVENT,
      )
    ) {
      continue;
    }
    stale.push({
      vendorBillId: bill.id,
      billNumber: bill.billNumber,
      status: bill.status,
      reason: "missing_purchase_bill_voucher",
    });
  }
  return stale;
}

/** Bills with inventory lines should increase warehouse stock (seed / hydrate sanity). */
export function findVendorBillInventoryDrift(state: AppState): string[] {
  const drifts: string[] = [];
  for (const bill of state.vendorBills) {
    if (!isVendorBillBookable(bill.status)) continue;
    for (const line of bill.items ?? []) {
      const itemId = line.inventoryItemId;
      const qty = Number(line.quantity);
      if (!itemId || !Number.isFinite(qty) || qty <= 0) continue;
      const item = state.inventoryItems.find((i) => i.id === itemId);
      if (!item) {
        drifts.push(`${bill.id}:missing-item-${itemId}`);
      }
    }
  }
  return drifts;
}
