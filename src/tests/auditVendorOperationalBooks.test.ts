import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { debtorCreditorSummary } from "@/lib/audit/debtorCreditorTotals";
import { computeProfitLoss } from "@/lib/audit/profitLossCalc";
import { getAccountsPayable } from "@/domain/finance/financialSemantics";
import {
  getVendorBillOpenBalance,
  isVendorBillOpenPayable,
  sumBookableVendorBillsInPeriod,
  sumVendorOpenPayables,
} from "@/lib/vendorBillVoucherPosting";
import type { VendorBill } from "@/types/inventory";

const bill = (overrides: Partial<VendorBill> = {}): VendorBill => ({
  id: "VB-1",
  vendorId: 1,
  vendorName: "Acme",
  billNumber: "VB-001",
  billDate: "2026-05-10",
  total: 100000,
  gst: 18000,
  amountPaid: 0,
  status: "pending",
  items: [],
  ...overrides,
});

describe("DA1 — audit vendor books match Vendor detail + voucher path", () => {
  it("sumVendorOpenPayables excludes draft bills", () => {
    const bills = [
      bill({ id: "VB-DRAFT", status: "draft", total: 50000 }),
      bill({ id: "VB-OPEN", status: "pending", total: 80000, amountPaid: 20000 }),
      bill({ id: "VB-PAID", status: "paid", total: 99999 }),
    ];
    expect(sumVendorOpenPayables(bills)).toBe(60000);
    expect(getAccountsPayable(bills)).toBe(60000);
  });

  it("sumBookableVendorBillsInPeriod excludes draft from COGS", () => {
    const bills = [
      bill({ status: "draft", total: 50000, billDate: "2026-05-01" }),
      bill({ status: "approved", total: 120000, billDate: "2026-05-15" }),
    ];
    const inMay = (d: string) => d.startsWith("2026-05");
    expect(sumBookableVendorBillsInPeriod(bills, inMay)).toBe(120000);
    const pl = computeProfitLoss(
      {
        invoices: [],
        saleBills: [],
        expenses: [],
        incomes: [],
        vendorBills: bills,
        inventoryItems: [],
        payments: [],
      },
      inMay,
      "accrual",
    );
    expect(pl.cogs).toBe(120000);
  });

  it("hydrated seed: audit AP equals debtor/creditor summary and per-vendor open balances", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const ap = getAccountsPayable(hydrated.vendorBills);
    const dc = debtorCreditorSummary([], [], hydrated.vendorBills, []);
    expect(ap).toBe(dc.totalPayables);

    let vendorDetailStyle = 0;
    for (const b of hydrated.vendorBills) {
      if (isVendorBillOpenPayable(b.status)) {
        vendorDetailStyle += getVendorBillOpenBalance(b);
      }
    }
    expect(ap).toBe(vendorDetailStyle);
  });
});
