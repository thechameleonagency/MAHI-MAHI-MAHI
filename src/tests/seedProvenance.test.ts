/**
 * D1 — referential integrity for curated `seedData` exports (layer-aware FK checks).
 */
import { describe, expect, it } from "vitest";
import { projectKindConfigs } from "@/domain/projectTypes/config";
import type { ProjectKind } from "@/domain/projectTypes/types";
import {
  seedAgents,
  seedAttendanceRecords,
  seedAuditLogs,
  seedCustomers,
  seedEmployees,
  seedEnquiries,
  seedExpenses,
  seedIncomes,
  seedInventoryItems,
  seedInvoices,
  seedLoans,
  seedLoanRepayments,
  seedPartnerTransactions,
  seedPartners,
  seedPayments,
  seedProjects,
  seedReviewQueue,
  seedSites,
  seedEmployeePayrollRecords,
  seedTasks,
  seedTeams,
} from "@/data/seedData";
import { normalizeProject } from "@/lib/projectNormalize";

describe("seed provenance (D1)", () => {
  const customerIds = new Set(seedCustomers.map((c) => c.id));
  const projectIds = new Set(seedProjects.map((p) => p.id));
  const employeeIds = new Set(seedEmployees.map((e) => e.id));
  const partnerIds = new Set(seedPartners.map((p) => p.id));
  const agentIds = new Set(seedAgents.map((a) => a.id));
  const inventoryIds = new Set(seedInventoryItems.map((i) => i.id));
  const loanIds = new Set(seedLoans.map((l) => l.id));
  const enquiryIds = new Set(seedEnquiries.map((e) => e.id));
  const teamIds = new Set(seedTeams.map((t) => t.id));
  const expenseIds = new Set(seedExpenses.map((e) => e.id));
  const invoiceIds = new Set(seedInvoices.map((i) => i.id));

  function siteKeysByProject(): Map<string, Set<string>> {
    const m = new Map<string, Set<string>>();
    for (const s of seedSites) {
      if (!m.has(s.projectId)) m.set(s.projectId, new Set());
      m.get(s.projectId)!.add(String(s.id));
    }
    return m;
  }

  it("sites reference projects and checklist inventory ids", () => {
    for (const s of seedSites) {
      expect(projectIds.has(s.projectId)).toBe(true);
      for (const row of s.checklistItems ?? []) {
        if (row.inventoryItemId != null) {
          expect(inventoryIds.has(row.inventoryItemId)).toBe(true);
        }
      }
    }
  });

  it("every project with customerId references a customer", () => {
    for (const p of seedProjects) {
      if (p.customerId) {
        expect(customerIds.has(p.customerId)).toBe(true);
      }
    }
  });

  it("every project kind from config appears at least once", () => {
    const kinds = new Set(
      seedProjects.map((p) => normalizeProject(p).projectKind).filter(Boolean) as ProjectKind[],
    );
    for (const k of Object.keys(projectKindConfigs) as ProjectKind[]) {
      expect(kinds.has(k)).toBe(true);
    }
  });

  it("each project kind has at least one Completed lifecycle project", () => {
    for (const k of Object.keys(projectKindConfigs) as ProjectKind[]) {
      const rows = seedProjects.filter((p) => (normalizeProject(p).projectKind ?? "SOLO_EPC") === k);
      const completed = rows.some((p) => normalizeProject(p).lifecycleStatus === "Completed");
      expect(completed, `kind ${k} needs a Completed project`).toBe(true);
    }
  });

  it("attendance rows reference employees and valid site tokens", () => {
    for (const a of seedAttendanceRecords) {
      expect(employeeIds.has(a.employeeId)).toBe(true);
      for (const token of a.sites) {
        if (token === "Office") continue;
        expect(projectIds.has(token), `attendance site token ${token}`).toBe(true);
      }
    }
  });

  it("tasks reference project, employee or team, and site id for that project", () => {
    const sites = siteKeysByProject();
    for (const t of seedTasks) {
      expect(projectIds.has(t.projectId)).toBe(true);
      if (t.employeeId != null) expect(employeeIds.has(t.employeeId)).toBe(true);
      if (t.teamId != null) expect(teamIds.has(t.teamId)).toBe(true);
      const keys = sites.get(t.projectId);
      expect(keys?.has(t.siteId), `task ${t.id} siteId ${t.siteId} for project ${t.projectId}`).toBe(true);
    }
  });

  it("invoices reference customers and optional project", () => {
    for (const inv of seedInvoices) {
      expect(customerIds.has(inv.customerId)).toBe(true);
      if (inv.projectId) expect(projectIds.has(inv.projectId)).toBe(true);
    }
  });

  it("incomes with projectId reference projects", () => {
    for (const inc of seedIncomes) {
      if (inc.projectId) expect(projectIds.has(inc.projectId)).toBe(true);
    }
  });

  it("partner transactions reference partners and optional project", () => {
    for (const pt of seedPartnerTransactions) {
      expect(partnerIds.has(pt.partnerId)).toBe(true);
      if (pt.projectId) expect(projectIds.has(pt.projectId)).toBe(true);
    }
  });

  it("payments reference optional project / invoice / loan", () => {
    for (const pay of seedPayments) {
      if (pay.projectId) expect(projectIds.has(pay.projectId)).toBe(true);
      if (pay.invoiceId) expect(invoiceIds.has(pay.invoiceId)).toBe(true);
      if (pay.loanId) expect(loanIds.has(pay.loanId)).toBe(true);
    }
  });

  it("loan repayments reference loans", () => {
    for (const lr of seedLoanRepayments) {
      expect(loanIds.has(lr.loanId)).toBe(true);
    }
  });

  it("seed loan repayments with linkedPaymentId reference matching payments (E6)", () => {
    const paymentById = new Map(seedPayments.map((p) => [p.id, p]));
    for (const lr of seedLoanRepayments) {
      if (!lr.linkedPaymentId) continue;
      const pay = paymentById.get(lr.linkedPaymentId);
      expect(pay, `payment for ${lr.id}`).toBeDefined();
      expect(pay!.loanRepaymentId).toBe(lr.id);
      expect(pay!.loanId).toBe(lr.loanId);
      expect(pay!.amount).toBe(lr.totalPaid);
    }
  });

  it("enquiries with agentId reference agents", () => {
    for (const e of seedEnquiries) {
      if (e.agentId) expect(agentIds.has(e.agentId)).toBe(true);
    }
  });

  it("audit logs reference known entity ids by type", () => {
    for (const log of seedAuditLogs) {
      switch (log.entityType) {
        case "Enquiry":
          expect(enquiryIds.has(log.entityId)).toBe(true);
          break;
        case "Project":
          expect(projectIds.has(log.entityId)).toBe(true);
          break;
        case "Invoice":
          expect(invoiceIds.has(log.entityId)).toBe(true);
          break;
        default:
          break;
      }
    }
  });

  it("accounting review queue references existing expenses", () => {
    for (const r of seedReviewQueue) {
      if (r.eventType === "ExpenseCreated" && r.sourceDocumentId) {
        expect(expenseIds.has(r.sourceDocumentId)).toBe(true);
      }
    }
  });

  it("payroll rows reference known employees", () => {
    for (const r of seedEmployeePayrollRecords) {
      expect(employeeIds.has(r.employeeId)).toBe(true);
    }
  });

  /** UD7 — site rows cover multiple projects with mixed material vs non-material checklist lines. */
  it("seed sites include procurement / checklist variety (UD7)", () => {
    expect(seedSites.length).toBeGreaterThanOrEqual(3);
    const withMaterial = seedSites.filter((s) =>
      (s.checklistItems ?? []).some((c) => c.requiresMaterial && c.inventoryItemId != null),
    );
    const nonMaterialOnly = seedSites.filter((s) =>
      (s.checklistItems ?? []).some((c) => !c.requiresMaterial),
    );
    expect(withMaterial.length).toBeGreaterThanOrEqual(1);
    expect(nonMaterialOnly.length).toBeGreaterThanOrEqual(1);
  });
});
