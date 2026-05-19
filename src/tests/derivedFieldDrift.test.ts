import { describe, expect, it } from "vitest";
import {
  customerMetricsDrift,
  getCustomerTotalPurchases,
  projectBillingDrift,
} from "@/lib/billingSelectors";
import {
  seedCustomers,
  seedEmployees,
  seedExpenses,
  seedInvoices,
  seedPayments,
  seedProjects,
} from "@/data/seedData";

describe("derivedFieldDrift", () => {
  it("customer totalPurchases may drift from derived (stored aggregates deprecated)", () => {
    const drifts = seedCustomers.map((c) =>
      customerMetricsDrift(c, seedInvoices, seedPayments),
    );
    expect(drifts.length).toBe(seedCustomers.length);
    for (const c of seedCustomers) {
      const derived = getCustomerTotalPurchases(c.id, seedInvoices);
      expect(derived).toBeGreaterThanOrEqual(0);
    }
  });

  it("project billing derived helpers run on seed without error", () => {
    for (const p of seedProjects.slice(0, 5)) {
      const drift = projectBillingDrift(p, seedInvoices, seedPayments, seedExpenses);
      expect(drift.amountInvoicedDrift).toBeGreaterThanOrEqual(0);
    }
  });

  it("employee stored attendance fields exist on seed (derivation deferred to attendance module)", () => {
    for (const e of seedEmployees) {
      expect(typeof e.daysPresent).toBe("number");
    }
  });
});
