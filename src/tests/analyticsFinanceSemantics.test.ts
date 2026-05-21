import { describe, expect, it } from "vitest";
import { computeFinanceMetrics } from "@/lib/analytics/finance";
import { computeCustomerMetrics } from "@/lib/analytics/customers";
import { analyticsRangeToIsoBounds, inAnalyticsRange } from "@/lib/analytics/dateRange";
import { getRevenueCash } from "@/domain/finance/financialSemantics";
import { getCustomerTotalReceived } from "@/lib/billingSelectors";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import type { Invoice, Payment } from "@/types/finance";

const baseInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: "inv-a",
  invoiceNumber: "INV-A",
  type: "invoice",
  documentTypeSource: "user",
  customerId: "cust-a",
  customerName: "Alpha",
  items: [],
  services: [],
  subtotal: 100000,
  cgst: 9000,
  sgst: 9000,
  igst: 0,
  total: 118000,
  amountReceived: 10000,
  status: "partial",
  invoiceDate: "2026-05-15",
  dueDate: "2026-05-25",
  createdAt: "2026-05-15",
  ...overrides,
});

const paymentIn = (overrides: Partial<Payment> = {}): Payment => ({
  id: "pay-a",
  date: "2026-05-16",
  amount: 45000,
  direction: "in",
  paymentMode: "Bank Transfer",
  counterpartyType: "customer",
  customerId: "cust-a",
  invoiceId: "inv-a",
  ...overrides,
});

describe("V7 — analytics and audit use unified cash/revenue helpers", () => {
  const now = new Date("2026-05-20T12:00:00");

  it("computeFinanceMetrics revenueCash matches getRevenueCash for each range", () => {
    const invoices = [baseInvoice()];
    const payments = [paymentIn(), paymentIn({ id: "pay-b", date: "2025-12-01", amount: 999 })];
    const slices = {
      enquiries: [],
      quotations: [],
      projects: [],
      customers: [],
      invoices,
      payments,
      expenses: [],
      inventoryItems: [],
      tasks: [],
      agents: [],
    };

    const expectedByRange = {
      month: 45000,
      quarter: 45000,
      year: 45000,
      all: 45999,
    } as const;

    for (const range of ["month", "quarter", "year", "all"] as const) {
      const { fromDate, toDate } = analyticsRangeToIsoBounds(range, now);
      const metrics = computeFinanceMetrics(slices, range, now);
      const legacy = payments
        .filter((p) => p.direction === "in" && inAnalyticsRange(p.date, range, now))
        .reduce((s, p) => s + p.amount, 0);
      expect(metrics.revenueCash).toBe(getRevenueCash(payments, fromDate, toDate));
      expect(metrics.revenueCash).toBe(legacy);
      expect(metrics.revenueCash).toBe(expectedByRange[range]);
    }
  });

  it("computeCustomerMetrics LTV uses payment-linked receipts, not stored amountReceived alone", () => {
    const invoices = [baseInvoice({ amountReceived: 10000 })];
    const payments = [paymentIn({ amount: 45000 })];
    const slices = {
      enquiries: [],
      quotations: [],
      projects: [],
      customers: [{ id: "cust-a", name: "Alpha", customerKind: "project" as const }],
      invoices,
      payments,
      expenses: [],
      inventoryItems: [],
      tasks: [],
      agents: [],
    };

    const metrics = computeCustomerMetrics(slices);
    const expected = getCustomerTotalReceived("cust-a", invoices, payments);
    expect(expected).toBe(45000);
    expect(metrics.summaryRows.find((r) => r.label === "Top LTV (sample)")?.value).toBe("Alpha");
  });

  it("hydrated seed finance metrics cash matches getRevenueCash (year range)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const range = "year" as const;
    const now = new Date("2026-05-20T12:00:00");
    const slices = {
      enquiries: hydrated.enquiries,
      quotations: hydrated.quotations,
      projects: hydrated.projects,
      customers: hydrated.customers,
      invoices: hydrated.invoices,
      payments: hydrated.payments,
      expenses: hydrated.expenses,
      inventoryItems: hydrated.inventoryItems,
      tasks: hydrated.tasks,
      agents: hydrated.agents,
      vendorBills: hydrated.vendorBills,
      loans: hydrated.loans,
    };
    const { fromDate, toDate } = analyticsRangeToIsoBounds(range, now);
    const metrics = computeFinanceMetrics(slices, range, now);
    expect(metrics.revenueCash).toBe(getRevenueCash(hydrated.payments, fromDate, toDate));
  });
});
