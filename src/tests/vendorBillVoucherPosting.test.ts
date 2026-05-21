import { describe, expect, it } from "vitest";
import {
  hasPurchaseBillBookedVoucher,
  planVendorBillAccountingUpdate,
  postVendorBillAdjustmentVoucher,
  postVendorBillVoucher,
  reconcileVendorBillVouchers,
  stripVendorBillAccounting,
  vendorBillBooksAmountChanged,
  vendorBillInventoryLineDeltas,
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

  it("posts PurchaseBillAdjusted for total delta on booked bill (MD7)", () => {
    const result = postVendorBillAdjustmentVoucher("VB-TEST-1", 5000);
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.voucher.sourceEvent).toBe("PurchaseBillAdjusted");
      expect(result.voucher.lines[0]?.debit).toBe(5000);
    }
    const decrease = postVendorBillAdjustmentVoucher("VB-TEST-1", -3000);
    expect(decrease?.ok).toBe(true);
    if (decrease?.ok) {
      expect(decrease.voucher.lines[0]?.accountCode).toBe("2100_ACCOUNTS_PAYABLE");
      expect(decrease.voucher.lines[0]?.debit).toBe(3000);
    }
  });

  it("planVendorBillAccountingUpdate books draft→approved and adjusts totals", () => {
    const draft = bill({ status: "draft", total: 100000 });
    const approved = { ...draft, status: "approved" as const };
    const initialPlan = planVendorBillAccountingUpdate({
      vouchers: [],
      before: draft,
      after: approved,
    });
    expect(initialPlan.stripExisting).toBe(false);
    expect(initialPlan.postings).toHaveLength(1);
    expect(initialPlan.postings[0]?.ok).toBe(true);

    const booked = postVendorBillVoucher(approved)!;
    expect(booked.ok).toBe(true);
    const vouchers = booked.ok ? [booked.voucher] : [];
    const revised = { ...approved, total: 110000 };
    expect(vendorBillBooksAmountChanged(approved, revised)).toBe(true);

    const adjustPlan = planVendorBillAccountingUpdate({
      vouchers,
      before: approved,
      after: revised,
    });
    expect(adjustPlan.postings).toHaveLength(1);
    if (adjustPlan.postings[0]?.ok) {
      expect(adjustPlan.postings[0].voucher.sourceEvent).toBe("PurchaseBillAdjusted");
    }
  });

  it("planVendorBillAccountingUpdate strips GL when reverting to draft", () => {
    const booked = bill({ status: "approved" });
    const initial = postVendorBillVoucher(booked)!;
    expect(initial.ok).toBe(true);
    const vouchers = initial.ok ? [initial.voucher] : [];
    const plan = planVendorBillAccountingUpdate({
      vouchers,
      before: booked,
      after: { ...booked, status: "draft" },
    });
    expect(plan.stripExisting).toBe(true);
    expect(plan.postings).toHaveLength(0);
    const stripped = stripVendorBillAccounting(
      { accountingVouchers: vouchers, accountingReviewQueue: [] },
      booked.id,
    );
    expect(stripped.accountingVouchers).toHaveLength(0);
  });

  it("vendorBillInventoryLineDeltas sums per inventoryItemId", () => {
    const before = bill({
      items: [
        { description: "A", quantity: 2, rate: 100, amount: 200, inventoryItemId: "MAT-1" },
      ],
    });
    const after = bill({
      items: [
        { description: "A", quantity: 5, rate: 100, amount: 500, inventoryItemId: "MAT-1" },
        { description: "B", quantity: 1, rate: 50, amount: 50, inventoryItemId: "MAT-2" },
      ],
    });
    expect(vendorBillInventoryLineDeltas(before, after)).toEqual([
      { itemId: "MAT-1", deltaQty: 3 },
      { itemId: "MAT-2", deltaQty: 1 },
    ]);
  });
});
