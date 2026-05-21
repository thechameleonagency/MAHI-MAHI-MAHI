import type { AppState } from "@/contexts/AppDataContext";
import { hasVendorPaymentRecordedVoucher, VENDOR_PAYMENT_EVENT } from "@/lib/vendorPaymentVoucherPosting";

export type StaleVendorPaymentBooks = {
  vendorPaymentId: string;
  vendorId: string;
  amount: number;
  reason: "missing_vendor_payment_voucher";
};

/** Recorded vendor payments must have VendorPaymentRecorded in vouchers or review queue. */
export function findStaleVendorPaymentBooks(state: AppState): StaleVendorPaymentBooks[] {
  const stale: StaleVendorPaymentBooks[] = [];
  for (const payment of state.vendorPayments) {
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) continue;
    if (hasVendorPaymentRecordedVoucher(state.accountingVouchers, payment.id)) continue;
    if (
      state.accountingReviewQueue.some(
        (q) => q.sourceDocumentId === payment.id && q.eventType === VENDOR_PAYMENT_EVENT,
      )
    ) {
      continue;
    }
    stale.push({
      vendorPaymentId: payment.id,
      vendorId: payment.vendorId,
      amount: payment.amount,
      reason: "missing_vendor_payment_voucher",
    });
  }
  return stale;
}
