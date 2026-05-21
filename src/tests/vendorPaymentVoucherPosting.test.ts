import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { findStaleVendorPaymentBooks } from "@/lib/vendorPaymentPipelineContinuity";
import {
  hasVendorPaymentRecordedVoucher,
  postVendorPaymentVoucher,
  reconcileVendorPaymentVouchers,
  stripVendorPaymentAccounting,
} from "@/lib/vendorPaymentVoucherPosting";
import type { AppState } from "@/contexts/AppDataContext";
import type { VendorPayment } from "@/types/inventory";

const payment = (overrides: Partial<VendorPayment> = {}): VendorPayment => ({
  id: "VP-TEST-1",
  vendorId: "V-1",
  vendorName: "Acme Supplies",
  billId: "VB-1",
  billNumber: "VB-2026-9001",
  date: "2026-05-10",
  amount: 50000,
  paymentMode: "Bank Transfer",
  ...overrides,
});

describe("vendorPaymentVoucherPosting (C2 / V2)", () => {
  it("posts VendorPaymentRecorded for positive amounts", () => {
    const result = postVendorPaymentVoucher(payment());
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.voucher.sourceEvent).toBe("VendorPaymentRecorded");
      expect(result.voucher.sourceDocumentId).toBe("VP-TEST-1");
      expect(result.voucher.lines[0]?.accountCode).toBe("2100_ACCOUNTS_PAYABLE");
      expect(result.voucher.lines[0]?.debit).toBe(50000);
    }
  });

  it("skips voucher for zero or negative amounts", () => {
    expect(postVendorPaymentVoucher(payment({ amount: 0 }))).toBeNull();
    expect(postVendorPaymentVoucher(payment({ amount: -1 }))).toBeNull();
  });

  it("reconcileVendorPaymentVouchers backfills missing GL rows", () => {
    const state = {
      vendorPayments: [payment()],
      vendorBills: [{ id: "VB-1", projectId: "P-1" }],
      accountingVouchers: [],
      accountingReviewQueue: [],
    } as unknown as AppState;

    const next = reconcileVendorPaymentVouchers(state);
    expect(hasVendorPaymentRecordedVoucher(next.accountingVouchers, "VP-TEST-1")).toBe(true);
  });

  it("reconcile is idempotent when voucher already exists", () => {
    const first = postVendorPaymentVoucher(payment())!;
    expect(first.ok).toBe(true);
    const state = {
      vendorPayments: [payment()],
      accountingVouchers: first.ok ? [first.voucher] : [],
      accountingReviewQueue: [],
    } as unknown as AppState;

    const next = reconcileVendorPaymentVouchers(state);
    expect(next.accountingVouchers.filter((v) => v.sourceDocumentId === "VP-TEST-1")).toHaveLength(1);
  });

  it("stripVendorPaymentAccounting removes GL rows for payment id", () => {
    const first = postVendorPaymentVoucher(payment())!;
    const state = {
      accountingVouchers: first.ok ? [first.voucher] : [],
      accountingReviewQueue: [],
    } as unknown as AppState;
    const stripped = stripVendorPaymentAccounting(state, "VP-TEST-1");
    expect(stripped.accountingVouchers).toHaveLength(0);
  });

  it("hydrated business seed has no stale vendor payment books (FC4)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleVendorPaymentBooks(hydrated)).toEqual([]);
    const withPayment = hydrated.vendorPayments.filter((vp) => vp.amount > 0);
    expect(withPayment.length).toBeGreaterThan(0);
    for (const vp of withPayment.slice(0, 5)) {
      expect(hasVendorPaymentRecordedVoucher(hydrated.accountingVouchers, vp.id)).toBe(true);
    }
  });
});
