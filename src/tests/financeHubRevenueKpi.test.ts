import { describe, expect, it } from "vitest";
import { buildFinanceHubRevenueBreakdown } from "@/lib/financeHubKpiBreakdown";
import { getRevenueCash } from "@/domain/finance/financialSemantics";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import type { Invoice, Payment } from "@/types/finance";

const inRange =
  (from?: string, to?: string) =>
  (iso: string | undefined | null): boolean => {
    if (!iso) return true;
    if (from && iso < from) return false;
    if (to && iso > to) return false;
    return true;
  };

const baseInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: "inv-1",
  invoiceNumber: "INV-1",
  type: "invoice",
  documentTypeSource: "user",
  customerId: "c1",
  customerName: "Alpha",
  items: [],
  services: [],
  subtotal: 100000,
  cgst: 9000,
  sgst: 9000,
  igst: 0,
  total: 118000,
  amountReceived: 99999,
  status: "partial",
  invoiceDate: "2026-05-10",
  dueDate: "2026-05-20",
  createdAt: "2026-05-10",
  ...overrides,
});

const paymentIn = (overrides: Partial<Payment> = {}): Payment => ({
  id: "pay-1",
  date: "2026-05-12",
  amount: 40000,
  direction: "in",
  paymentMode: "Bank Transfer",
  counterpartyType: "customer",
  customerId: "c1",
  invoiceId: "inv-1",
  counterpartyName: "Alpha",
  ...overrides,
});

describe("DA2 — Finance hub revenue KPI uses payment-based cash only", () => {
  it("cashRevenue matches getRevenueCash and ignores stored invoice.amountReceived", () => {
    const invoices = [baseInvoice({ amountReceived: 99999 })];
    const payments = [paymentIn(), paymentIn({ id: "pay-2", date: "2026-04-01", amount: 5000 })];
    const breakdown = buildFinanceHubRevenueBreakdown(
      payments,
      invoices,
      [],
      inRange("2026-05-01", "2026-05-31"),
      "2026-05-01",
      "2026-05-31",
    );

    expect(breakdown.cashRevenue).toBe(40000);
    expect(breakdown.cashRevenue).toBe(getRevenueCash(payments, "2026-05-01", "2026-05-31"));
    expect(breakdown.cashFromInvoices + breakdown.cashFromSaleBills + breakdown.cashUnlinked).toBe(
      breakdown.cashRevenue,
    );
  });

  it("hydrated seed breakdown cash matches getRevenueCash for a bounded period", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const from = "2025-01-01";
    const to = "2026-12-31";
    const breakdown = buildFinanceHubRevenueBreakdown(
      hydrated.payments,
      hydrated.invoices,
      hydrated.saleBills ?? [],
      inRange(from, to),
      from,
      to,
    );
    expect(breakdown.cashRevenue).toBe(getRevenueCash(hydrated.payments, from, to));
    expect(breakdown.cashRevenue).toBeGreaterThan(0);
  });
});
