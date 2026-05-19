/**
 * Phase 4.5 audit page totals cross-check.
 *
 * Asserts that the same calculator inputs produce the same numbers regardless of
 * which audit page consumes them. This is the automated counterpart to the manual
 * 12-page operator walk-through; if a future page diverges from the shared
 * calculators in `src/lib/audit/*`, this test will catch it before the manual round.
 */
import { describe, it, expect } from "vitest";
import {
  computeLedgerTotals,
  computeDebtorRows,
  computeCreditorRows,
  debtorCreditorSummary,
  computeProfitLoss,
  summarizeInventoryMovements,
  computeGstSummary,
  computeHsnSacBreakdown,
  buildCashBankEntries,
  applyRunningBalance,
} from "@/lib/audit";
import {
  seedInvoices,
  seedExpenses,
  seedInventoryItems,
  seedVendorBills,
  seedPayments,
  seedVendorPayments,
  seedLoanRepayments,
  seedIncomes,
} from "@/data/seedData";

const inAnyPeriod = () => true;

describe("audit page totals — cross check", () => {
  it("AuditDashboard receivables match DebtorsCreditors total", () => {
    const totals = computeLedgerTotals(
      {
        invoices: seedInvoices,
        saleBills: [],
        expenses: seedExpenses,
        vendorBills: seedVendorBills,
        inventoryItems: seedInventoryItems,
        materialDamageRecords: [],
      },
      inAnyPeriod,
    );
    const dcSummary = debtorCreditorSummary(seedInvoices, [], seedVendorBills);
    expect(totals.receivablesOpen).toBe(dcSummary.totalReceivables);
    expect(totals.payablesOpen).toBe(dcSummary.totalPayables);
  });

  it("AuditDashboard-style net profit uses computeProfitLoss (accrual)", () => {
    const pl = computeProfitLoss(
      {
        invoices: seedInvoices,
        saleBills: [],
        expenses: seedExpenses,
        incomes: seedIncomes ?? [],
        vendorBills: seedVendorBills,
        inventoryItems: seedInventoryItems,
        materialDamageRecords: [],
        payments: seedPayments,
      },
      inAnyPeriod,
      "accrual",
    );
    expect(Math.round(pl.netProfit)).toBe(Math.round(pl.profitBeforeTax - pl.totalTax));
  });

  it("ProfitLoss revenue + direct/indirect lines sum to netProfit", () => {
    const pl = computeProfitLoss(
      {
        invoices: seedInvoices,
        saleBills: [],
        expenses: seedExpenses,
        incomes: seedIncomes ?? [],
        vendorBills: seedVendorBills,
        inventoryItems: seedInventoryItems,
        materialDamageRecords: [],
        payments: seedPayments,
      },
      inAnyPeriod,
      "cash",
    );
    expect(pl.revenueTotal).toBeGreaterThanOrEqual(0);
    expect(pl.totalDirect).toBeGreaterThanOrEqual(0);
    expect(pl.totalIndirect).toBeGreaterThanOrEqual(0);
    // netProfit = revenue − cogs − damageWriteOff − agentAndCommission − partnerShare − totalDirect − totalIndirect
    const expectedNet =
      pl.revenueTotal -
      pl.cogs -
      pl.damageWriteOff -
      pl.agentAndCommission -
      pl.partnerShare -
      pl.totalDirect -
      pl.totalIndirect;
    expect(Math.round(pl.netProfit)).toBe(Math.round(expectedNet));
  });

  it("DebtorsCreditors row outstanding sums match summary totals", () => {
    const debtors = computeDebtorRows(seedInvoices, []);
    const creditors = computeCreditorRows(seedVendorBills);
    const sumDebtors = debtors.reduce((s, r) => s + r.outstanding, 0);
    const sumCreditors = creditors.reduce((s, r) => s + r.outstanding, 0);
    const summary = debtorCreditorSummary(seedInvoices, [], seedVendorBills);
    expect(Math.round(sumDebtors)).toBe(Math.round(summary.totalReceivables));
    expect(Math.round(sumCreditors)).toBe(Math.round(summary.totalPayables));
  });

  it("Inventory reconciliation closing matches sum of on-hand", () => {
    const rec = summarizeInventoryMovements(seedInventoryItems, []);
    const sumOnHand = seedInventoryItems.reduce((s, i) => s + (i.stock ?? 0), 0);
    expect(rec.closingUnits).toBe(sumOnHand);
  });

  it("GST summary outputGST matches HSN breakdown total", () => {
    const gst = computeGstSummary(seedInvoices, [], seedVendorBills, inAnyPeriod);
    const hsn = computeHsnSacBreakdown(seedInvoices, [], inAnyPeriod);
    const hsnTotal = hsn.reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0);
    expect(Math.round(gst.outputGST)).toBe(Math.round(hsnTotal));
  });

  it("Cash bank ledger running balance is a finite number per entry", () => {
    const rows = buildCashBankEntries({
      payments: seedPayments,
      expenses: seedExpenses,
      incomes: seedIncomes ?? [],
      vendorPayments: seedVendorPayments,
      loanRepayments: seedLoanRepayments,
    });
    const withBalance = applyRunningBalance(rows, 0);
    for (const row of withBalance) {
      expect(Number.isFinite(row.balance)).toBe(true);
    }
    if (withBalance.length > 0) {
      const sumDelta = rows.reduce((s, r) => s + r.debit - r.credit, 0);
      const last = withBalance[0]; // applyRunningBalance returns most-recent first
      expect(Math.round(last.balance)).toBe(Math.round(sumDelta));
    }
  });
});
