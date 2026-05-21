import {
  VoucherPostingService,
  type AccountingEventType,
  type PostingResult,
} from "@/application/services/VoucherPostingService";
import type { AppState } from "@/contexts/AppDataContext";
import type { AccountingReviewQueueItem, AccountingVoucher } from "@/types/finance";
import type { VendorPayment } from "@/types/inventory";

export const VENDOR_PAYMENT_EVENT: AccountingEventType = "VendorPaymentRecorded";

/** Whether this vendor payment is already represented in the books. */
export function hasVendorPaymentRecordedVoucher(
  vouchers: AccountingVoucher[],
  paymentId: string,
): boolean {
  return vouchers.some(
    (v) => v.sourceDocumentId === paymentId && v.sourceEvent === VENDOR_PAYMENT_EVENT,
  );
}

/** Post AP reduction + bank credit when a vendor payment is recorded (C2 / V2). */
export function postVendorPaymentVoucher(
  payment: Pick<VendorPayment, "id" | "amount">,
  voucherService: VoucherPostingService = new VoucherPostingService(),
): PostingResult | null {
  const amount = payment.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return voucherService.post({
    type: VENDOR_PAYMENT_EVENT,
    sourceDocumentId: payment.id,
    amount,
    gstAmount: 0,
  });
}

export function vendorPaymentUpdateAffectsBooks(updates: Partial<VendorPayment>): boolean {
  return Object.prototype.hasOwnProperty.call(updates, "amount");
}

export function resolveVendorPaymentProjectId(
  state: Pick<AppState, "vendorBills">,
  payment: Pick<VendorPayment, "billId">,
): string | undefined {
  if (!payment.billId) return undefined;
  return state.vendorBills.find((b) => b.id === payment.billId)?.projectId;
}

function makeHydrationReviewItem(
  payment: VendorPayment,
  reason: string,
  projectId?: string,
): AccountingReviewQueueItem {
  return {
    id: `ARQ-VP-${payment.id}`,
    reason,
    eventType: VENDOR_PAYMENT_EVENT,
    sourceDocumentId: payment.id,
    projectId,
    amount: payment.amount,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Backfill missing VendorPaymentRecorded vouchers (persisted rows created before UI posted to GL).
 */
export function reconcileVendorPaymentVouchers(state: AppState): AppState {
  const voucherService = new VoucherPostingService();
  let accountingVouchers = [...state.accountingVouchers];
  let accountingReviewQueue = [...state.accountingReviewQueue];
  let changed = false;

  for (const payment of state.vendorPayments) {
    if (hasVendorPaymentRecordedVoucher(accountingVouchers, payment.id)) continue;
    if (
      accountingReviewQueue.some(
        (q) => q.sourceDocumentId === payment.id && q.eventType === VENDOR_PAYMENT_EVENT,
      )
    ) {
      continue;
    }

    const postingResult = postVendorPaymentVoucher(payment, voucherService);
    if (!postingResult) continue;

    changed = true;
    const projectId = resolveVendorPaymentProjectId(state, payment);
    if (postingResult.ok) {
      accountingVouchers = [postingResult.voucher, ...accountingVouchers];
    } else {
      const { reason } = postingResult.reviewQueueItem;
      accountingReviewQueue = [
        makeHydrationReviewItem(payment, reason, projectId),
        ...accountingReviewQueue,
      ];
    }
  }

  if (!changed) {
    return state;
  }

  return { ...state, accountingVouchers, accountingReviewQueue };
}

/** Remove GL artifacts when a vendor payment is deleted or re-posted after amount change. */
export function stripVendorPaymentAccounting(
  state: Pick<AppState, "accountingVouchers" | "accountingReviewQueue">,
  paymentId: string,
): Pick<AppState, "accountingVouchers" | "accountingReviewQueue"> {
  return {
    accountingVouchers: state.accountingVouchers.filter(
      (v) => !(v.sourceDocumentId === paymentId && v.sourceEvent === VENDOR_PAYMENT_EVENT),
    ),
    accountingReviewQueue: state.accountingReviewQueue.filter(
      (q) => !(q.sourceDocumentId === paymentId && q.eventType === VENDOR_PAYMENT_EVENT),
    ),
  };
}
