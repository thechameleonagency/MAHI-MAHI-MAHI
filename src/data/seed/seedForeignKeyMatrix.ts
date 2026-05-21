import type { AppState } from "@/contexts/AppDataContext";
import type { Invoice } from "@/types/finance";

export type SeedForeignKeyViolation = {
  entity: string;
  id: string;
  field: string;
  targetId: string;
  reason: "missing_target" | "link_drift";
};

function idSet<T extends { id: string }>(rows: T[]): Set<string> {
  return new Set(rows.map((r) => r.id));
}

function pushIfMissing(
  violations: SeedForeignKeyViolation[],
  entity: string,
  id: string,
  field: string,
  targetId: string | undefined,
  targets: Set<string>,
): void {
  const ref = targetId?.trim();
  if (!ref) return;
  if (!targets.has(ref)) {
    violations.push({
      entity,
      id,
      field,
      targetId: ref,
      reason: "missing_target",
    });
  }
}

function isNonMasterMaterialId(materialId: string): boolean {
  return materialId.startsWith("nm:");
}

/** Appendix J — cross-collection FK matrix for seeded / hydrated AppState (ER8). */
export function findSeedForeignKeyViolations(state: AppState): SeedForeignKeyViolation[] {
  const violations: SeedForeignKeyViolation[] = [];

  const customers = idSet(state.customers);
  const projects = idSet(state.projects);
  const quotations = idSet(state.quotations);
  const enquiries = idSet(state.enquiries);
  const vendors = idSet(state.vendors);
  const inventory = idSet(state.inventoryItems);
  const agents = idSet(state.agents);
  const employees = idSet(state.employees);
  const teams = idSet(state.teams);
  const partners = idSet(state.partners);
  const loans = idSet(state.loans);
  const vendorBills = idSet(state.vendorBills);
  const vendorPayments = idSet(state.vendorPayments);
  const sites = idSet(state.sites);
  const tasks = idSet(state.tasks);
  const blockages = idSet(state.blockages);
  const tickets = idSet(state.operationalTickets);
  const teamMembers = idSet(state.settingsTeamMembers);
  const incGivers = idSet(state.incGiverCompanies ?? []);
  const agentCommissionPayments = idSet(state.agentCommissionPayments ?? []);

  const billingDocs = new Set<string>([
    ...state.invoices.map((i) => i.id),
    ...state.saleBills.map((i) => i.id),
  ]);

  const billingById = new Map<string, Invoice>();
  for (const inv of [...state.invoices, ...state.saleBills]) {
    billingById.set(inv.id, inv);
  }

  for (const e of state.enquiries) {
    pushIfMissing(violations, "enquiry", e.id, "customerId", e.customerId, customers);
    pushIfMissing(violations, "enquiry", e.id, "agentId", e.agentId, agents);
    pushIfMissing(violations, "enquiry", e.id, "assignedToMemberId", e.assignedToMemberId, teamMembers);
    pushIfMissing(violations, "enquiry", e.id, "quotationId", e.quotationId, quotations);
    for (const qid of e.quotationIds ?? []) {
      pushIfMissing(violations, "enquiry", e.id, "quotationIds", qid, quotations);
    }
  }

  for (const q of state.quotations) {
    pushIfMissing(violations, "quotation", q.id, "customerId", q.customerId, customers);
    pushIfMissing(violations, "quotation", q.id, "enquiryId", q.enquiryId, enquiries);
    pushIfMissing(violations, "quotation", q.id, "agentId", q.agentId, agents);
    pushIfMissing(violations, "quotation", q.id, "linkedProjectId", q.linkedProjectId, projects);
    if (q.convertedToInvoiceId) {
      pushIfMissing(violations, "quotation", q.id, "convertedToInvoiceId", q.convertedToInvoiceId, billingDocs);
    }
  }

  for (const p of state.projects) {
    pushIfMissing(violations, "project", p.id, "customerId", p.customerId, customers);
    pushIfMissing(violations, "project", p.id, "quotationId", p.quotationId, quotations);
    pushIfMissing(violations, "project", p.id, "agentId", p.agentId, agents);
    if (p.invoiceId) pushIfMissing(violations, "project", p.id, "invoiceId", p.invoiceId, billingDocs);
    for (const invId of p.invoiceIds ?? []) {
      pushIfMissing(violations, "project", p.id, "invoiceIds", invId, billingDocs);
    }
    for (const partnerRow of p.partners ?? []) {
      pushIfMissing(violations, "project", p.id, "partners.partnerId", partnerRow.partnerId, partners);
    }
    if (p.scope?.partnerId) {
      pushIfMissing(violations, "project", p.id, "scope.partnerId", p.scope.partnerId, partners);
    }
    if (p.scope?.incGiverCompanyId) {
      pushIfMissing(violations, "project", p.id, "scope.incGiverCompanyId", p.scope.incGiverCompanyId, incGivers);
    }
    if (p.channelPartnerIdRef) {
      pushIfMissing(violations, "project", p.id, "channelPartnerIdRef", p.channelPartnerIdRef, partners);
    }
  }

  const checkBilling = (entity: string, inv: Invoice) => {
    pushIfMissing(violations, entity, inv.id, "customerId", inv.customerId, customers);
    pushIfMissing(violations, entity, inv.id, "projectId", inv.projectId, projects);
    pushIfMissing(violations, entity, inv.id, "quotationId", inv.quotationId, quotations);
  };
  for (const inv of state.invoices) checkBilling("invoice", inv);
  for (const inv of state.saleBills) checkBilling("saleBill", inv);

  for (const pay of state.payments) {
    pushIfMissing(violations, "payment", pay.id, "customerId", pay.customerId, customers);
    pushIfMissing(violations, "payment", pay.id, "projectId", pay.projectId, projects);
    pushIfMissing(violations, "payment", pay.id, "invoiceId", pay.invoiceId, billingDocs);
    pushIfMissing(violations, "payment", pay.id, "partnerId", pay.partnerId, partners);
    pushIfMissing(violations, "payment", pay.id, "vendorBillId", pay.vendorBillId, vendorBills);
    pushIfMissing(violations, "payment", pay.id, "loanId", pay.loanId, loans);
  }

  for (const cpr of state.clientPaymentRecords) {
    pushIfMissing(violations, "clientPaymentRecord", cpr.id, "projectId", cpr.projectId, projects);
  }

  for (const exp of state.expenses) {
    pushIfMissing(violations, "expense", exp.id, "projectId", exp.projectId, projects);
    pushIfMissing(violations, "expense", exp.id, "employeeId", exp.employeeId, employees);
    pushIfMissing(violations, "expense", exp.id, "vendorId", exp.vendorId, vendors);
    if (exp.allocation?.projectId) {
      pushIfMissing(violations, "expense", exp.id, "allocation.projectId", exp.allocation.projectId, projects);
    }
    if (exp.allocation?.employeeId) {
      pushIfMissing(violations, "expense", exp.id, "allocation.employeeId", exp.allocation.employeeId, employees);
    }
  }

  for (const inc of state.incomes) {
    pushIfMissing(violations, "income", inc.id, "projectId", inc.projectId, projects);
    pushIfMissing(violations, "income", inc.id, "partnerId", inc.partnerId, partners);
    pushIfMissing(violations, "income", inc.id, "employeeId", inc.employeeId, employees);
    pushIfMissing(violations, "income", inc.id, "loanId", inc.loanId, loans);
  }

  for (const site of state.sites) {
    pushIfMissing(violations, "site", site.id, "projectId", site.projectId, projects);
    for (const line of site.checklistItems ?? []) {
      if (line.inventoryItemId) {
        pushIfMissing(violations, "site", site.id, "checklist.inventoryItemId", line.inventoryItemId, inventory);
      }
    }
  }

  for (const task of state.tasks) {
    pushIfMissing(violations, "task", task.id, "projectId", task.projectId, projects);
    pushIfMissing(violations, "task", task.id, "siteId", task.siteId, sites);
    pushIfMissing(violations, "task", task.id, "employeeId", task.employeeId, employees);
    pushIfMissing(violations, "task", task.id, "teamId", task.teamId, teams);
  }

  for (const share of state.quotationShareDetails ?? []) {
    pushIfMissing(violations, "quotationShare", share.id, "quotationId", share.quotationId, quotations);
  }

  for (const dr of state.deletionRequests ?? []) {
    pushIfMissing(violations, "deletionRequest", dr.id, "responsiblePersonId", dr.responsiblePersonId, employees);
    const target =
      dr.entityType === "quotation"
        ? quotations
        : dr.entityType === "project"
          ? projects
          : dr.entityType === "invoice"
            ? billingDocs
            : dr.entityType === "sale-bill"
              ? billingDocs
              : undefined;
    if (target) {
      pushIfMissing(violations, "deletionRequest", dr.id, "entityId", dr.entityId, target);
    }
  }

  for (const bill of state.vendorBills) {
    pushIfMissing(violations, "vendorBill", bill.id, "vendorId", bill.vendorId, vendors);
    pushIfMissing(violations, "vendorBill", bill.id, "projectId", bill.projectId, projects);
    for (const line of bill.items ?? []) {
      pushIfMissing(violations, "vendorBill", bill.id, "items.inventoryItemId", line.inventoryItemId, inventory);
    }
  }

  for (const vp of state.vendorPayments) {
    pushIfMissing(violations, "vendorPayment", vp.id, "vendorId", vp.vendorId, vendors);
    pushIfMissing(violations, "vendorPayment", vp.id, "billId", vp.billId, vendorBills);
  }

  for (const b of state.blockages) {
    pushIfMissing(violations, "blockage", b.id, "projectId", b.projectId, projects);
    pushIfMissing(violations, "blockage", b.id, "linkedTaskId", b.linkedTaskId, tasks);
  }

  for (const t of state.operationalTickets) {
    pushIfMissing(violations, "ticket", t.id, "projectId", t.projectId, projects);
    pushIfMissing(violations, "ticket", t.id, "linkedBlockageId", t.linkedBlockageId, blockages);
    for (const empId of t.assignedTo ?? []) {
      pushIfMissing(violations, "ticket", t.id, "assignedTo", empId, employees);
    }
  }

  for (const si of state.scheduledInstallations ?? []) {
    pushIfMissing(violations, "scheduledInstallation", si.id, "projectId", si.projectId, projects);
    pushIfMissing(violations, "scheduledInstallation", si.id, "teamId", si.teamId, teams);
    for (const empId of si.employeeIds ?? []) {
      pushIfMissing(violations, "scheduledInstallation", si.id, "employeeIds", empId, employees);
    }
  }

  for (const visit of state.siteVisits ?? []) {
    pushIfMissing(violations, "siteVisit", visit.id, "projectId", visit.projectId, projects);
  }

  for (const cr of state.projectChangeRequests ?? []) {
    pushIfMissing(violations, "projectChangeRequest", cr.id, "projectId", cr.projectId, projects);
    pushIfMissing(violations, "projectChangeRequest", cr.id, "generatedInvoiceId", cr.generatedInvoiceId, billingDocs);
    for (const delta of cr.materialDelta ?? []) {
      pushIfMissing(violations, "projectChangeRequest", cr.id, "materialDelta.itemId", delta.itemId, inventory);
    }
  }

  for (const dmg of state.materialDamageRecords ?? []) {
    pushIfMissing(violations, "materialDamage", dmg.id, "itemId", dmg.itemId, inventory);
    pushIfMissing(violations, "materialDamage", dmg.id, "projectId", dmg.projectId, projects);
  }

  for (const acc of state.agentCommissionAccruals ?? []) {
    pushIfMissing(violations, "agentCommissionAccrual", acc.id, "agentId", acc.agentId, agents);
    pushIfMissing(violations, "agentCommissionAccrual", acc.id, "projectId", acc.projectId, projects);
    pushIfMissing(violations, "agentCommissionAccrual", acc.id, "sourceQuotationId", acc.sourceQuotationId, quotations);
    pushIfMissing(violations, "agentCommissionAccrual", acc.id, "linkedPaymentId", acc.linkedPaymentId, agentCommissionPayments);
  }

  for (const line of state.procurementNeedLines ?? []) {
    pushIfMissing(violations, "procurementNeedLine", line.id, "projectId", line.projectId, projects);
    pushIfMissing(violations, "procurementNeedLine", line.id, "siteId", line.siteId, sites);
    pushIfMissing(violations, "procurementNeedLine", line.id, "vendorId", line.vendorId, vendors);
    pushIfMissing(violations, "procurementNeedLine", line.id, "vendorBillId", line.vendorBillId, vendorBills);
    if (!isNonMasterMaterialId(line.materialId)) {
      pushIfMissing(violations, "procurementNeedLine", line.id, "materialId", line.materialId, inventory);
    }
  }

  for (const res of state.materialReservations ?? []) {
    pushIfMissing(violations, "materialReservation", res.id, "itemId", res.itemId, inventory);
    pushIfMissing(violations, "materialReservation", res.id, "projectId", res.projectId, projects);
  }

  for (const pt of state.partnerTransactions) {
    pushIfMissing(violations, "partnerTransaction", pt.id, "partnerId", pt.partnerId, partners);
    pushIfMissing(violations, "partnerTransaction", pt.id, "projectId", pt.projectId, projects);
  }

  for (const rep of state.loanRepayments) {
    pushIfMissing(violations, "loanRepayment", rep.id, "loanId", rep.loanId, loans);
  }

  for (const igt of state.incGiverTransactions ?? []) {
    pushIfMissing(violations, "incGiverTransaction", igt.id, "incGiverCompanyId", igt.incGiverCompanyId, incGivers);
    pushIfMissing(violations, "incGiverTransaction", igt.id, "projectId", igt.projectId, projects);
  }

  for (const acp of state.agentCommissionPayments ?? []) {
    pushIfMissing(violations, "agentCommissionPayment", acp.id, "agentId", acp.agentId, agents);
    pushIfMissing(violations, "agentCommissionPayment", acp.id, "projectId", acp.projectId, projects);
  }

  for (const h of state.employeePaidHolidays) {
    pushIfMissing(violations, "employeePaidHoliday", h.id, "employeeId", h.employeeId, employees);
  }

  for (const oi of state.ownerInvestments) {
    pushIfMissing(violations, "ownerInvestment", oi.id, "projectId", oi.projectId, projects);
  }

  for (const att of state.attendanceRecords) {
    pushIfMissing(violations, "attendanceRecord", att.id, "employeeId", att.employeeId, employees);
  }

  for (const v of state.vendors) {
    pushIfMissing(violations, "vendor", v.id, "linkedProjectId", v.linkedProjectId, projects);
  }

  for (const team of state.teams) {
    for (const memberId of team.memberIds ?? []) {
      pushIfMissing(violations, "team", team.id, "memberIds", memberId, employees);
    }
    pushIfMissing(violations, "team", team.id, "leadId", team.leadId, employees);
  }

  // Bidirectional quotation ↔ project link sanity
  for (const q of state.quotations) {
    if (!q.linkedProjectId) continue;
    const project = state.projects.find((p) => p.id === q.linkedProjectId);
    if (project && project.quotationId && project.quotationId !== q.id) {
      violations.push({
        entity: "quotation",
        id: q.id,
        field: "linkedProjectId.quotationId",
        targetId: project.quotationId,
        reason: "missing_target",
      });
    }
  }

  return violations;
}

export function formatSeedForeignKeyErrors(violations: SeedForeignKeyViolation[]): string[] {
  return violations.map(
    (v) =>
      `ER8: ${v.entity} ${v.id} — ${v.field} → ${v.targetId} (${v.reason})`,
  );
}

/** @deprecated Use findSeedForeignKeyViolations — kept for tests importing the legacy name. */
export const findStaleSeedForeignKeys = findSeedForeignKeyViolations;
