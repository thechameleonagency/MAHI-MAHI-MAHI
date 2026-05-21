import { describe, expect, it } from "vitest";
import {
  hasPurchaseBillBookedVoucher,
  postVendorBillVoucher,
  reconcileVendorBillVouchers,
} from "@/lib/vendorBillVoucherPosting";
import type { AppState } from "@/contexts/AppDataContext";
import type { VendorBill } from "@/types/inventory";

const bill = (overrides: Partial<VendorBill> = {}): VendorBill => ({
  id: "VB-TEST-1",
  vendorId: "V-1",
  vendorName: "Acme Supplies",
  billNumber: "VB-2026-9001",
  billDate: "2026-05-01",
  total: 118000,
  subtotal: 100000,
  gst: 18000,
  amountPaid: 0,
  status: "pending",
  items: [{ description: "Panels", quantity: 10, rate: 10000, amount: 100000 }],
  ...overrides,
});

describe("vendorBillVoucherPosting (C2)", () => {
  it("skips voucher for draft bills", () => {
    expect(postVendorBillVoucher(bill({ status: "draft" }))).toBeNull();
  });

  it("posts PurchaseBillBooked for approved/pending bills", () => {
    const result = postVendorBillVoucher(bill({ status: "approved" }));
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.voucher.sourceEvent).toBe("PurchaseBillBooked");
      expect(result.voucher.sourceDocumentId).toBe("VB-TEST-1");
    }
  });

  it("reconcileVendorBillVouchers backfills missing GL rows", () => {
    const state = {
      vendorBills: [bill()],
      accountingVouchers: [],
      accountingReviewQueue: [],
    } as unknown as AppState;

    const next = reconcileVendorBillVouchers(state);
    expect(hasPurchaseBillBookedVoucher(next.accountingVouchers, "VB-TEST-1")).toBe(true);
  });

  it("reconcile is idempotent when voucher already exists", () => {
    const first = postVendorBillVoucher(bill())!;
    expect(first.ok).toBe(true);
    const state = {
      vendorBills: [bill()],
      accountingVouchers: first.ok ? [first.voucher] : [],
      accountingReviewQueue: [],
    } as unknown as AppState;

    const next = reconcileVendorBillVouchers(state);
    expect(next.accountingVouchers.filter((v) => v.sourceDocumentId === "VB-TEST-1")).toHaveLength(1);
  });
});
