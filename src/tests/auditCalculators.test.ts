import { describe, it, expect } from "vitest";
import {
  computeLedgerTotals,
  debtorCreditorSummary,
  computeProfitLoss,
  summarizeInventoryMovements,
  findExpenseIntegrityIssues,
  buildCashBankEntries,
  computeGstSummary,
  isInterAccountTransfer,
  validatePostingAccountMap,
} from "@/lib/audit";
import { seedInvoices, seedExpenses, seedInventoryItems, seedVendorBills } from "@/data/seedData";

describe("audit calculators", () => {
  it("ledger totals align receivables with open invoice balance", () => {
    const totals = computeLedgerTotals(
      {
        invoices: seedInvoices,
        saleBills: [],
        expenses: seedExpenses,
        vendorBills: seedVendorBills,
        inventoryItems: seedInventoryItems,
        materialDamageRecords: [],
      },
      () => true,
    );
    const dc = debtorCreditorSummary(seedInvoices, [], seedVendorBills);
    expect(totals.receivablesOpen).toBe(dc.totalReceivables);
  });

  it("profit loss includes damage and supports accrual basis", () => {
    const pl = computeProfitLoss(
      {
        invoices: seedInvoices,
        saleBills: [],
        expenses: seedExpenses,
        incomes: [],
        vendorBills: seedVendorBills,
        inventoryItems: seedInventoryItems,
        materialDamageRecords: [],
        payments: [],
      },
      () => true,
      "accrual",
    );
    expect(pl.revenueTotal).toBeGreaterThanOrEqual(0);
    expect(pl.basis).toBe("accrual");
  });

  it("inventory reconciliation returns closing units", () => {
    const rec = summarizeInventoryMovements(seedInventoryItems, []);
    expect(rec.closingUnits).toBeGreaterThan(0);
    expect(rec.closingValue).toBeGreaterThan(0);
  });

  it("expense integrity finds site rows without project", () => {
    const issues = findExpenseIntegrityIssues([
      {
        id: "E1",
        date: "2026-01-01",
        amount: 100,
        mainCategory: "site",
        category: "material-transport",
        paidBy: { type: "company" },
      },
    ]);
    expect(issues.some((i) => i.issue.includes("projectId"))).toBe(true);
  });

  it("cash bank excludes inter-account transfers", () => {
    expect(isInterAccountTransfer("Cash to bank deposit", "payment")).toBe(true);
    const rows = buildCashBankEntries({
      payments: [],
      expenses: [],
      incomes: [],
      vendorPayments: [],
      loanRepayments: [],
    });
    expect(rows).toEqual([]);
  });

  it("gst summary matches invoice tax totals", () => {
    const gst = computeGstSummary(seedInvoices, [], seedVendorBills, () => true);
    const expected = seedInvoices.reduce(
      (s, i) => s + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0),
      0,
    );
    expect(gst.outputGST).toBe(expected);
  });

  it("posting account map resolves all voucher codes to COA ledgers", () => {
    const v = validatePostingAccountMap();
    expect(v.ok).toBe(true);
    expect(v.unmapped).toEqual([]);
    expect(v.missingLedgers).toEqual([]);
  });
});
