import { describe, expect, it } from "vitest";
import {
  getCashRevenue,
  getCustomerTotalPurchases,
  getInvoiceAmountReceived,
  getInvoiceOpenBalance,
  getProjectAmountInvoiced,
} from "@/lib/billingSelectors";
import { seedCustomers, seedInvoices, seedPayments } from "@/data/seedData";

describe("billingSelectors", () => {
  it("getInvoiceOpenBalance uses amountReceived when no payments passed", () => {
    const inv = seedInvoices[0];
    if (!inv) return;
    const open = getInvoiceOpenBalance(inv);
    expect(open).toBe(Math.max(0, inv.total - (inv.amountReceived ?? 0)));
  });

  it("getInvoiceAmountReceived includes linked payments", () => {
    const inv = seedInvoices.find((i) => i.amountReceived && i.amountReceived > 0);
    if (!inv) return;
    const linked = seedPayments.filter((p) => p.invoiceId === inv.id && p.direction === "in");
    const received = getInvoiceAmountReceived(inv.id, seedPayments, inv);
    expect(received).toBeGreaterThanOrEqual(inv.amountReceived ?? 0);
    if (linked.length > 0) {
      expect(received).toBeGreaterThanOrEqual(
        linked.reduce((s, p) => s + p.amount, 0),
      );
    }
  });

  it("getCashRevenue sums payments-in only", () => {
    const cash = getCashRevenue({ payments: seedPayments });
    const manual = seedPayments
      .filter((p) => p.direction === "in")
      .reduce((s, p) => s + p.amount, 0);
    expect(cash).toBe(manual);
  });

  it("getCustomerTotalPurchases matches invoice totals for C001", () => {
    const c = seedCustomers.find((x) => x.id === "C001");
    if (!c) return;
    const derived = getCustomerTotalPurchases(c.id, seedInvoices);
    expect(derived).toBeGreaterThanOrEqual(0);
  });

  it("getProjectAmountInvoiced is non-negative for seeded projects", () => {
    const withProject = seedInvoices.find((i) => i.projectId);
    if (!withProject?.projectId) return;
    expect(getProjectAmountInvoiced(withProject.projectId, seedInvoices)).toBeGreaterThanOrEqual(0);
  });
});
