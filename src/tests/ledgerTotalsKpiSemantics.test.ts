import { describe, expect, it } from "vitest";
import { computeLedgerTotals } from "@/lib/audit/ledgerTotals";
import { computeProfitLoss } from "@/lib/audit/profitLossCalc";
import { debtorCreditorSummary } from "@/lib/audit/debtorCreditorTotals";
import { getRevenueCash, getOutstandingReceivables } from "@/domain/finance/financialSemantics";
import type { Invoice, Payment } from "@/types/finance";

const baseInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: "inv-1",
  invoiceNumber: "INV-1",
  type: "invoice",
  documentTypeSource: "user",
  customerId: "c1",
  customerName: "Acme",
  items: [],
  services: [],
  subtotal: 100000,
  cgst: 9000,
  sgst: 9000,
  igst: 0,
  total: 118000,
  amountReceived: 40000,
  status: "partial",
  invoiceDate: "2026-05-10",
  dueDate: "2026-05-20",
  createdAt: "2026-05-10",
  ...overrides,
});

const paymentIn = (overrides: Partial<Payment> = {}): Payment => ({
  id: "pay-1",
  date: "2026-05-12",
  amount: 50000,
  direction: "in",
  paymentMode: "Bank Transfer",
  counterpartyType: "customer",
  invoiceId: "inv-1",
  ...overrides,
});

describe("M4 — audit KPI semantics align with finance", () => {
  it("computeLedgerTotals uses payment-in cash, not invoice.amountReceived sum", () => {
    const invoices = [baseInvoice()];
    const payments = [paymentIn({ amount: 50000 })];
    const inPeriod = (d: string) => d.startsWith("2026-05");

    const ledger = computeLedgerTotals(
      { invoices, saleBills: [], expenses: [], vendorBills: [], inventoryItems: [], payments },
      inPeriod,
    );

    expect(ledger.revenueCollected).toBe(50000);
    expect(ledger.revenueCollected).toBe(getRevenueCash(payments, "2026-05-01", "2026-05-31"));
    expect(ledger.revenueCollected).not.toBe(40000);
  });

  it("computeLedgerTotals receivablesOpen matches getOutstandingReceivables", () => {
    const invoices = [baseInvoice({ amountReceived: 0, status: "pending" })];
    const payments = [paymentIn({ amount: 30000 })];
    const inPeriod = () => true;

    const ledger = computeLedgerTotals(
      { invoices, saleBills: [], expenses: [], vendorBills: [], inventoryItems: [], payments },
      inPeriod,
    );

    const expected = getOutstandingReceivables(invoices, payments, []);
    expect(ledger.receivablesOpen).toBe(expected);
    expect(ledger.receivablesOpen).toBe(88000);
  });

  it("computeProfitLoss cash basis uses payments only", () => {
    const invoices = [baseInvoice({ amountReceived: 99999 })];
    const payments = [paymentIn({ amount: 25000, date: "2026-05-15" })];
    const inPeriod = (d: string) => d.startsWith("2026-05");

    const pl = computeProfitLoss(
      { invoices, saleBills: [], expenses: [], incomes: [], vendorBills: [], inventoryItems: [], payments },
      inPeriod,
      "cash",
    );

    expect(pl.revenueTotal).toBe(25000);
    expect(pl.revenueTotal).not.toBe(99999);
  });

  it("debtorCreditorSummary outstanding uses payment-linked balance", () => {
    const invoices = [baseInvoice({ amountReceived: 0, status: "partial" })];
    const payments = [paymentIn({ amount: 60000 })];
    const dc = debtorCreditorSummary(invoices, [], [], payments);

    expect(dc.totalReceivables).toBe(58000);
    expect(dc.debtors[0]?.amountReceived).toBe(60000);
    expect(dc.debtors[0]?.outstanding).toBe(58000);
  });
});
