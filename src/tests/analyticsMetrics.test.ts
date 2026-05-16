import { describe, it, expect } from "vitest";
import {
  computePipelineMetrics,
  computeOperationsMetrics,
  computeFinanceMetrics,
  computeInventoryMetrics,
  computeCustomerMetrics,
} from "@/lib/analytics";
import {
  seedEnquiries,
  seedQuotations,
  seedProjects,
  seedCustomers,
  seedInvoices,
  seedPayments,
  seedExpenses,
  seedInventoryItems,
  seedTasks,
  seedAgents,
} from "@/data/seedData";

const slices = {
  enquiries: seedEnquiries,
  quotations: seedQuotations,
  projects: seedProjects,
  customers: seedCustomers,
  invoices: seedInvoices,
  payments: seedPayments,
  expenses: seedExpenses,
  inventoryItems: seedInventoryItems,
  tasks: seedTasks,
  agents: seedAgents,
  materialDamageRecords: [],
  scheduledInstallations: [],
  materialReservations: [],
  vendorBills: [],
  loans: [],
};

describe("analytics metrics", () => {
  it("computes pipeline metrics from seed", () => {
    const m = computePipelineMetrics(slices, "all");
    expect(m.enquiriesCreated).toBeGreaterThan(0);
    expect(m.summaryRows.length).toBeGreaterThan(0);
  });

  it("computes operations and finance metrics", () => {
    const ops = computeOperationsMetrics(slices, "all");
    expect(Object.keys(ops.projectsByKind).length).toBeGreaterThan(0);
    const fin = computeFinanceMetrics(slices, "all");
    expect(fin.debtorBuckets.length).toBe(4);
    expect(fin.revenueAccrual).toBeGreaterThanOrEqual(0);
  });

  it("computes inventory and customer metrics", () => {
    const inv = computeInventoryMetrics(slices);
    expect(inv.onHandUnits).toBeGreaterThan(0);
    const cust = computeCustomerMetrics(slices);
    expect(cust.summaryRows.length).toBeGreaterThan(0);
  });
});
