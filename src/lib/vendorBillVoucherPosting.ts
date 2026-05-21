import {
  VoucherPostingService,
  type AccountingEventType,
  type PostingResult,
} from "@/application/services/VoucherPostingService";
import type { AppState } from "@/contexts/AppDataContext";
import type { AccountingReviewQueueItem, AccountingVoucher } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";

const PURCHASE_BILL_EVENT: AccountingEventType = "PurchaseBillBooked";

/** Whether a purchase bill is already represented in the books. */
export function hasPurchaseBillBookedVoucher(
  vouchers: AccountingVoucher[],
  billId: string,
): boolean {
  return vouchers.some(
    (v) => v.sourceDocumentId === billId && v.sourceEvent === PURCHASE_BILL_EVENT,
  );
}

/** Book AP + purchases when a vendor bill is operational (non-draft). */
export function postVendorBillVoucher(
  bill: Pick<VendorBill, "id" | "status" | "total" | "gst">,
  voucherService: VoucherPostingService = new VoucherPostingService(),
): PostingResult | null {
  if (bill.status === "draft") {
    return null;
  }
  return voucherService.post({
    type: PURCHASE_BILL_EVENT,
    sourceDocumentId: bill.id,
    amount: bill.total,
    gstAmount: bill.gst ?? 0,
  });
}

function makeHydrationReviewItem(
  bill: VendorBill,
  reason: string,
): AccountingReviewQueueItem {
  return {
    id: `ARQ-VB-${bill.id}`,
    reason,
    eventType: PURCHASE_BILL_EVENT,
    sourceDocumentId: bill.id,
    projectId: bill.projectId,
    amount: bill.total,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Backfill missing PurchaseBillBooked vouchers for persisted/seed vendor bills
 * (e.g. bills created before UI posted to GL).
 */
export function reconcileVendorBillVouchers(state: AppState): AppState {
  const voucherService = new VoucherPostingService();
  let accountingVouchers = [...state.accountingVouchers];
  let accountingReviewQueue = [...state.accountingReviewQueue];
  let changed = false;

  for (const bill of state.vendorBills) {
    if (bill.status === "draft") continue;
    if (hasPurchaseBillBookedVoucher(accountingVouchers, bill.id)) continue;
    if (accountingReviewQueue.some((q) => q.sourceDocumentId === bill.id && q.eventType === PURCHASE_BILL_EVENT)) {
      continue;
    }

    const postingResult = postVendorBillVoucher(bill, voucherService);
    if (!postingResult) continue;

    changed = true;
    if (postingResult.ok) {
      accountingVouchers = [postingResult.voucher, ...accountingVouchers];
    } else {
      const { reason } = postingResult.reviewQueueItem;
      accountingReviewQueue = [makeHydrationReviewItem(bill, reason), ...accountingReviewQueue];
    }
  }

  if (!changed) {
    return state;
  }

  return { ...state, accountingVouchers, accountingReviewQueue };
}

/** Remove GL artifacts when a vendor bill is deleted. */
export function stripVendorBillAccounting(
  state: Pick<AppState, "accountingVouchers" | "accountingReviewQueue">,
  billId: string,
): Pick<AppState, "accountingVouchers" | "accountingReviewQueue"> {
  return {
    accountingVouchers: state.accountingVouchers.filter(
      (v) => !(v.sourceDocumentId === billId && v.sourceEvent === PURCHASE_BILL_EVENT),
    ),
    accountingReviewQueue: state.accountingReviewQueue.filter((q) => q.sourceDocumentId !== billId),
  };
}
