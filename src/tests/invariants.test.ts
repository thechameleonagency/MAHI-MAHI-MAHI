/**
 * Phase 5.5 — Cross-entity invariants.
 *
 * Walks every seed collection and asserts numerical / referential invariants that
 * MUST hold across the application's data model. A failure here means a seed row
 * (or an unguarded mutation path the seeds exercise) violates a business rule —
 * fix the rule enforcement in `AppDataContext` and re-run.
 *
 * Closes ledger P0 #35-37 + 5 P1 items under M1 (cross-entity invariants).
 */
import { describe, it, expect } from "vitest";
import {
  seedInvoices,
  seedPayments,
  seedExpenses,
  seedIncomes,
  seedLoans,
  seedLoanRepayments,
  seedProjects,
  seedCustomers,
  seedVendors,
  seedEmployees,
  seedTasks,
  seedTeams,
  seedSites,
  seedInventoryItems,
  seedQuotations,
  seedEnquiries,
  seedAttendanceRecords,
  seedPartners,
  seedPartnerTransactions,
} from "@/data/seedData";

describe("invariants — finance amounts", () => {
  it("every invoice.amountReceived ≤ invoice.total", () => {
    for (const inv of seedInvoices) {
      const received = inv.amountReceived ?? 0;
      expect(received, `invoice ${inv.id} (${inv.invoiceNumber})`).toBeLessThanOrEqual(inv.total);
    }
  });

  it("every project.commissionPaid ≤ project.commissionAmount", () => {
    for (const p of seedProjects) {
      const paid = p.commissionPaid ?? 0;
      const owed = p.commissionAmount ?? 0;
      expect(paid, `project ${p.id} (${p.name}) commission`).toBeLessThanOrEqual(owed);
    }
  });

  it("every project.amountReceived ≤ project.contractAmount", () => {
    for (const p of seedProjects) {
      if (p.contractAmount == null) continue;
      const received = p.amountReceived ?? 0;
      expect(received, `project ${p.id} amountReceived vs contractAmount`).toBeLessThanOrEqual(p.contractAmount);
    }
  });

  it("every payment.amount > 0", () => {
    for (const pay of seedPayments) {
      expect(pay.amount, `payment ${pay.id}`).toBeGreaterThan(0);
    }
  });

  it("every expense.amount > 0", () => {
    for (const exp of seedExpenses) {
      expect(exp.amount, `expense ${exp.id}`).toBeGreaterThan(0);
    }
  });

  it("every income.amount > 0", () => {
    for (const inc of seedIncomes ?? []) {
      expect(inc.amount, `income ${inc.id}`).toBeGreaterThan(0);
    }
  });

  it("every quotation.totalAmount ≥ 0", () => {
    for (const q of seedQuotations) {
      const total = q.totalAmount ?? 0;
      expect(total, `quotation ${q.id}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("every loan repayment.principalPaid + interestPaid = totalPaid", () => {
    for (const r of seedLoanRepayments) {
      const sum = (r.principalPaid ?? 0) + (r.interestPaid ?? 0);
      expect(sum, `loan repayment ${r.id}`).toBe(r.totalPaid);
    }
  });

  it("sum(loan repayments by loan) is consistent with loan tenure", () => {
    for (const loan of seedLoans) {
      const repayments = seedLoanRepayments.filter((r) => r.loanId === loan.id);
      // each repayment.emiNumber must be unique within a loan
      const emiNumbers = repayments.map((r) => r.emiNumber);
      const unique = new Set(emiNumbers);
      expect(unique.size, `loan ${loan.id} EMI numbers unique`).toBe(emiNumbers.length);
      // and each emiNumber must be ≤ tenure
      for (const r of repayments) {
        expect(r.emiNumber, `loan ${loan.id} repayment ${r.id} emiNumber`).toBeLessThanOrEqual(loan.tenure);
      }
    }
  });
});

describe("invariants — dates", () => {
  it("every invoice.dueDate ≥ invoice.invoiceDate", () => {
    for (const inv of seedInvoices) {
      if (!inv.dueDate) continue;
      expect(inv.dueDate >= inv.invoiceDate, `invoice ${inv.id} due ${inv.dueDate} vs invoice ${inv.invoiceDate}`).toBe(true);
    }
  });

  it("every project.endDate ≥ project.startDate (when both set)", () => {
    for (const p of seedProjects) {
      if (!p.endDate || !p.startDate) continue;
      expect(p.endDate >= p.startDate, `project ${p.id} endDate vs startDate`).toBe(true);
    }
  });

  it("every task.workDate is a valid date string (YYYY-MM-DD)", () => {
    for (const t of seedTasks) {
      expect(/^\d{4}-\d{2}-\d{2}$/.test(t.workDate), `task ${t.id} workDate ${t.workDate}`).toBe(true);
    }
  });
});

describe("invariants — referential integrity", () => {
  const customerIds = new Set(seedCustomers.map((c) => c.id));
  const projectIds = new Set(seedProjects.map((p) => p.id));
  // Note: Vendor.id is `number` per type, but Expense.vendorId is `string`. We coerce
  // both sides to string here to mirror how UI lookups should behave (and to flag the
  // type-shape mismatch — `Vendor.id` ought to become `string` in a future round).
  const vendorIdsStr = new Set(seedVendors.map((v) => String(v.id)));
  const employeeIds = new Set(seedEmployees.map((e) => e.id));
  const teamIds = new Set(seedTeams.map((t) => t.id));
  const inventoryItemIds = new Set(seedInventoryItems.map((i) => i.id));
  const quotationIds = new Set(seedQuotations.map((q) => q.id));
  const partnerIds = new Set(seedPartners.map((p) => p.id));

  it("every invoice.customerId resolves to a real customer", () => {
    for (const inv of seedInvoices) {
      if (!inv.customerId) continue;
      expect(customerIds.has(inv.customerId), `invoice ${inv.id} customerId ${inv.customerId}`).toBe(true);
    }
  });

  it("every invoice.projectId (if set) resolves to a real project", () => {
    for (const inv of seedInvoices) {
      if (!inv.projectId) continue;
      expect(projectIds.has(inv.projectId), `invoice ${inv.id} projectId ${inv.projectId}`).toBe(true);
    }
  });

  it("every project.customerId resolves to a real customer", () => {
    for (const p of seedProjects) {
      if (!p.customerId) continue;
      expect(customerIds.has(p.customerId), `project ${p.id} customerId ${p.customerId}`).toBe(true);
    }
  });

  it("every project.quotationId (if set) resolves to a real quotation", () => {
    for (const p of seedProjects) {
      if (!p.quotationId) continue;
      expect(quotationIds.has(p.quotationId), `project ${p.id} quotationId ${p.quotationId}`).toBe(true);
    }
  });

  it("every task.projectId resolves to a real project", () => {
    for (const t of seedTasks) {
      expect(projectIds.has(t.projectId), `task ${t.id} projectId ${t.projectId}`).toBe(true);
    }
  });

  it("every task.employeeId (if set) resolves to a real employee", () => {
    for (const t of seedTasks) {
      if (t.employeeId == null) continue;
      expect(employeeIds.has(t.employeeId), `task ${t.id} employeeId ${t.employeeId}`).toBe(true);
    }
  });

  it("every task.teamId (if set) resolves to a real team", () => {
    for (const t of seedTasks) {
      if (!t.teamId) continue;
      expect(teamIds.has(t.teamId), `task ${t.id} teamId ${t.teamId}`).toBe(true);
    }
  });

  it("every expense.projectId (if set) resolves to a real project", () => {
    for (const e of seedExpenses) {
      if (!e.projectId) continue;
      expect(projectIds.has(e.projectId), `expense ${e.id} projectId ${e.projectId}`).toBe(true);
    }
  });

  it("every expense.vendorId (if set) resolves to a real vendor", () => {
    for (const e of seedExpenses) {
      if (!e.vendorId) continue;
      expect(vendorIdsStr.has(String(e.vendorId)), `expense ${e.id} vendorId ${e.vendorId}`).toBe(true);
    }
  });

  it("every site.projectId resolves to a real project", () => {
    for (const s of seedSites) {
      if (!s.projectId) continue;
      expect(projectIds.has(s.projectId), `site ${s.id} projectId ${s.projectId}`).toBe(true);
    }
  });

  it("every partnerTransaction.partnerId resolves to a real partner", () => {
    for (const tx of seedPartnerTransactions) {
      expect(partnerIds.has(tx.partnerId), `partnerTransaction ${tx.id} partnerId ${tx.partnerId}`).toBe(true);
    }
  });

  it("every attendance.employeeId resolves to a real employee", () => {
    for (const a of seedAttendanceRecords) {
      expect(employeeIds.has(a.employeeId), `attendance ${a.id} employeeId ${a.employeeId}`).toBe(true);
    }
  });

  it("every enquiry.customerId (if set) resolves to a real customer", () => {
    for (const e of seedEnquiries) {
      if (!e.customerId) continue;
      expect(customerIds.has(e.customerId), `enquiry ${e.id} customerId ${e.customerId}`).toBe(true);
    }
  });

  // Sanity: ensure inventory item IDs are unique
  it("inventory item IDs are unique", () => {
    const ids = seedInventoryItems.map((i) => i.id);
    expect(new Set(ids).size, "inventory item id collisions").toBe(ids.length);
  });
});

describe("invariants — uniqueness", () => {
  it("customer IDs are unique", () => {
    const ids = seedCustomers.map((c) => c.id);
    expect(new Set(ids).size, "customer id collisions").toBe(ids.length);
  });

  it("project IDs are unique", () => {
    const ids = seedProjects.map((p) => p.id);
    expect(new Set(ids).size, "project id collisions").toBe(ids.length);
  });

  it("employee IDs are unique", () => {
    const ids = seedEmployees.map((e) => e.id);
    expect(new Set(ids).size, "employee id collisions").toBe(ids.length);
  });

  it("vendor IDs are unique", () => {
    const ids = seedVendors.map((v) => v.id);
    expect(new Set(ids).size, "vendor id collisions").toBe(ids.length);
  });

  it("invoice IDs are unique", () => {
    const ids = seedInvoices.map((inv) => inv.id);
    expect(new Set(ids).size, "invoice id collisions").toBe(ids.length);
  });

  it("invoice numbers are unique", () => {
    const numbers = seedInvoices.map((inv) => inv.invoiceNumber);
    expect(new Set(numbers).size, "invoice number collisions").toBe(numbers.length);
  });

  it("quotation IDs are unique", () => {
    const ids = seedQuotations.map((q) => q.id);
    expect(new Set(ids).size, "quotation id collisions").toBe(ids.length);
  });
});

describe("invariants — status consistency", () => {
  it("invoice status 'paid' implies amountReceived === total", () => {
    for (const inv of seedInvoices) {
      if (inv.status !== "paid") continue;
      expect(inv.amountReceived ?? 0, `paid invoice ${inv.id}`).toBe(inv.total);
    }
  });

  it("invoice status 'partial' implies 0 < amountReceived < total", () => {
    for (const inv of seedInvoices) {
      if (inv.status !== "partial") continue;
      const received = inv.amountReceived ?? 0;
      expect(received, `partial invoice ${inv.id} amountReceived > 0`).toBeGreaterThan(0);
      expect(received, `partial invoice ${inv.id} amountReceived < total`).toBeLessThan(inv.total);
    }
  });

  it("invoice status 'pending' implies amountReceived === 0", () => {
    for (const inv of seedInvoices) {
      if (inv.status !== "pending") continue;
      expect(inv.amountReceived ?? 0, `pending invoice ${inv.id}`).toBe(0);
    }
  });
});
