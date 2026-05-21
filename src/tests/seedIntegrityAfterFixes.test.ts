import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { projectBillingDrift } from "@/lib/billingSelectors";
import { getOutstandingReceivables } from "@/domain/finance/financialSemantics";
import { computeLedgerTotals } from "@/lib/audit/ledgerTotals";
import { getCashRevenue } from "@/lib/billingSelectors";
import {
  buildProjectsListKpiStats,
  countProjectsByLifecycle,
  matchesProjectLifecycleFilter,
} from "@/lib/projectListFilters";
import { isBankReconciliationStatement } from "@/lib/bankReconciliationStatement";
import { findStaleOpenEnquiriesAfterProjectWin } from "@/lib/enquiryPipelineContinuity";
import { findStaleChangeRequestBilling } from "@/lib/changeRequestPipelineContinuity";
import { findStaleVendorBillBooks } from "@/lib/vendorBillPipelineContinuity";
import { findStaleVendorBillInventoryReceipt } from "@/lib/vendorBillInventoryLinkage";
import {
  findSeedForeignKeyViolations,
  formatSeedForeignKeyErrors,
} from "@/data/seed/seedForeignKeyMatrix";
import { findStaleIncGiverLedger } from "@/lib/incGiverLedgerContinuity";
import { findStaleBillingAmountReceived } from "@/lib/billingAmountReceivedContinuity";
import { findStaleProjectStartContinuity } from "@/lib/projectStartContinuity";
import { findStaleCprFifoVoidedAllocations } from "@/lib/cprFifoPipelineContinuity";
import { findStaleCustomerArchiveState } from "@/domain/customer/customerArchive";
import { findStaleSiteChecklistNeedToGetDrift } from "@/lib/siteChecklistNeedToGetSync";
import { findStaleProcurementNeedLines } from "@/lib/procurementNeedLineContinuity";
import { findStaleClientPaymentLedgerLinkage } from "@/lib/clientPaymentReconciliation";
import { findStaleEnquiryAssigneeState } from "@/lib/enquiryAssignee";
import { findStaleProjectCustomerLinkage } from "@/lib/projectCustomerLinkage";
import { findStaleProgressReportTaskLinkage } from "@/lib/progressReportTaskContinuity";

const DRIFT_EPS = 1;

describe("seed & hydration integrity after audit fixes", () => {
  it("full business seed passes verifySeedState", () => {
    const { verification } = buildBusinessSeed("full");
    if (!verification.ok) {
      console.error("Seed errors:", verification.errors);
    }
    expect(verification.ok, verification.errors.join("; ")).toBe(true);
  });

  it("hydrated smoke seed passes ER8 foreign-key matrix", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const violations = findSeedForeignKeyViolations(hydrated);
    expect(violations, formatSeedForeignKeyErrors(violations).join("; ")).toEqual([]);
  });

  it("hydrated projects: amountInvoiced and amountReceived match derived totals", () => {
    const { state: seeded } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(seeded);

    const invoicedDrifts: string[] = [];
    const receivedDrifts: string[] = [];
    for (const project of hydrated.projects) {
      const drift = projectBillingDrift(
        project,
        hydrated.invoices,
        hydrated.payments,
        hydrated.expenses,
        hydrated.saleBills,
        hydrated.incomes,
        hydrated.incGiverTransactions ?? [],
      );
      if (drift.amountInvoicedDrift > DRIFT_EPS) {
        invoicedDrifts.push(`${project.id}:${drift.amountInvoicedDrift}`);
      }
      if (drift.amountReceivedDrift > DRIFT_EPS) {
        receivedDrifts.push(`${project.id}:${drift.amountReceivedDrift}`);
      }
    }

    expect(invoicedDrifts, `amountInvoiced drift on ${invoicedDrifts.slice(0, 5).join(", ")}`).toEqual([]);
    expect(receivedDrifts, `amountReceived drift on ${receivedDrifts.slice(0, 5).join(", ")}`).toEqual([]);
  });

  it("buildBusinessSeed output already has reconciled amountReceived (pre second hydration pass)", () => {
    const { state } = buildBusinessSeed("smoke");
    const drifts = state.projects
      .map((p) => ({
        id: p.id,
        drift: projectBillingDrift(
          p,
          state.invoices,
          state.payments,
          state.expenses,
          state.saleBills,
          state.incomes,
          state.incGiverTransactions ?? [],
        ).amountReceivedDrift,
      }))
      .filter((x) => x.drift > DRIFT_EPS);
    expect(drifts.map((d) => `${d.id}:${d.drift}`)).toEqual([]);
  });

  it("audit ledger receivables align with finance semantics after hydration", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const ledger = computeLedgerTotals(
      {
        invoices: hydrated.invoices,
        saleBills: hydrated.saleBills,
        expenses: hydrated.expenses,
        vendorBills: hydrated.vendorBills,
        inventoryItems: hydrated.inventoryItems,
        payments: hydrated.payments,
      },
      () => true,
    );
    const expectedAr = getOutstandingReceivables(
      hydrated.invoices,
      hydrated.payments,
      hydrated.saleBills,
    );
    expect(Math.abs(ledger.receivablesOpen - expectedAr)).toBeLessThanOrEqual(DRIFT_EPS);
    const cashIn = getCashRevenue({ payments: hydrated.payments });
    expect(Math.abs(ledger.revenueCollected - cashIn)).toBeLessThanOrEqual(DRIFT_EPS);
  });

  it("inc giver ledger aligns with INC_GIVEN projects on hydrated seed (ER4)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect((hydrated.incGiverTransactions ?? []).length).toBeGreaterThan(0);
    expect(findStaleIncGiverLedger(hydrated)).toEqual([]);
    for (const tx of hydrated.incGiverTransactions) {
      expect(hydrated.incGiverCompanies.some((c) => c.id === tx.incGiverCompanyId)).toBe(true);
      if (tx.projectId) {
        const project = hydrated.projects.find((p) => p.id === tx.projectId);
        expect(project?.projectKind).toBe("INC_GIVEN");
      }
    }
  });

  it("business seed includes New lifecycle projects filterable by MD3 list filter", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const newProjects = hydrated.projects.filter((p) => p.lifecycleStatus === "New");
    expect(newProjects.length).toBeGreaterThan(0);
    expect(newProjects.every((p) => matchesProjectLifecycleFilter(p, "New"))).toBe(true);
    expect(newProjects.every((p) => !p.startedAt)).toBe(true);
  });

  it("bank reconciliation statements are typed and linked on hydrated seed (MN3)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(hydrated.bankReconciliationStatements.length).toBeGreaterThan(0);
    expect(
      hydrated.bankReconciliationStatements.every((s) => isBankReconciliationStatement(s)),
    ).toBe(true);
    const stmtIds = new Set(hydrated.bankReconciliationStatements.map((s) => s.id));
    const linked = [
      ...hydrated.expenses,
      ...hydrated.incomes,
      ...hydrated.payments,
      ...hydrated.vendorPayments,
    ].filter((r) => r.reconciledWith?.statementId);
    for (const row of linked) {
      expect(stmtIds.has(row.reconciledWith!.statementId)).toBe(true);
    }
  });

  it("projects list KPI stats match lifecycle buckets on hydrated seed (MN2)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const counts = countProjectsByLifecycle(hydrated.projects);
    const stats = buildProjectsListKpiStats(hydrated.projects);
    expect(stats.total).toBe(counts.all);
    expect(stats.new).toBe(counts.New);
    expect(stats.inProgress).toBe(counts["In Progress"]);
    expect(stats.onHold).toBe(counts["On Hold"]);
    expect(stats.completed).toBe(counts.Completed);
    expect(stats.closed).toBe(counts.Closed);
    expect(parseFloat(stats.totalKW)).toBeGreaterThan(0);
  });

  it("enquiry assignees use member id and resolved display name (ER1)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(
      findStaleEnquiryAssigneeState(hydrated.enquiries, hydrated.settingsTeamMembers),
    ).toEqual([]);
  });

  it("project customer FK and client fields stay consistent on hydrated seed (ER3)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleProjectCustomerLinkage(hydrated)).toEqual([]);
    expect(findStaleProgressReportTaskLinkage(hydrated)).toEqual([]);
    for (const project of hydrated.projects) {
      if (!project.customerId || project.customerId.startsWith("inc-")) continue;
      const customer = hydrated.customers.find((c) => c.id === project.customerId);
      expect(customer, `project ${project.id}`).toBeTruthy();
      if (project.client?.trim()) {
        expect(project.client.trim().toLowerCase()).toBe(customer!.name.trim().toLowerCase());
      }
    }
  });

  it("no stale open enquiry after quotation approve on hydrated seed (FC2)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const approvedWithEnquiry = hydrated.quotations.filter(
      (q) => q.status === "approved" && q.enquiryId && q.customerId,
    );
    expect(approvedWithEnquiry.length).toBeGreaterThan(0);
    for (const q of approvedWithEnquiry) {
      const enquiry = hydrated.enquiries.find((e) => e.id === q.enquiryId);
      expect(enquiry?.status).toBe("converted");
    }
    expect(findStaleOpenEnquiriesAfterProjectWin(hydrated)).toEqual([]);
  });

  it("no stale open enquiry after quotation project win on hydrated seed (FC1)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleOpenEnquiriesAfterProjectWin(hydrated)).toEqual([]);
  });

  it("invoice, sale bill, and project amountReceived align on hydrated seed (ER5)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleBillingAmountReceived(hydrated)).toEqual([]);
  });

  it("client payment ledger linkage is consistent on hydrated seed (FC10)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(
      findStaleClientPaymentLedgerLinkage({
        clientPaymentRecords: hydrated.clientPaymentRecords,
        payments: hydrated.payments,
      }),
    ).toEqual([]);
  });

  it("site checklist syncs to Need-to-Get on hydrated seed (FC9)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(
      findStaleSiteChecklistNeedToGetDrift(
        hydrated.projects,
        hydrated.sites,
        hydrated.inventoryItems,
      ),
    ).toEqual([]);
    expect(findStaleProcurementNeedLines(hydrated)).toEqual([]);
  });

  it("customers auto-archive when all projects complete on hydrated seed (FC7)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleCustomerArchiveState(hydrated)).toEqual([]);
    const dex = hydrated.projects.find((p) =>
      p.directCreationReason?.includes("Urgent hospital backup power"),
    );
    if (dex?.customerId) {
      const customer = hydrated.customers.find((c) => c.id === dex.customerId);
      expect(customer?.archivedAt).toBeTruthy();
    }
  });

  it("voided and draft invoices have no CPR FIFO allocation on hydrated seed (FC6)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleCprFifoVoidedAllocations(hydrated)).toEqual([]);
  });

  it("started projects flip agent commission accruals to payable on hydrated seed (FC5)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleProjectStartContinuity(hydrated)).toEqual([]);
    const started = hydrated.projects.filter(
      (p) => p.startedAt && (p.lifecycleStatus === "In Progress" || p.lifecycleStatus === "On Hold"),
    );
    expect(started.length).toBeGreaterThan(0);
  });

  it("bookable vendor bills have warehouse receipt applied on hydrated seed (ER6)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleVendorBillInventoryReceipt(hydrated)).toEqual([]);
    const withInventory = hydrated.vendorBills.filter((b) =>
      (b.items ?? []).some((line) => line.inventoryItemId),
    );
    expect(withInventory.length).toBeGreaterThan(0);
    for (const bill of withInventory) {
      if (bill.status === "draft") continue;
      expect(bill.warehouseReceiptApplied, bill.billNumber).toBe(true);
    }
  });

  it("bookable vendor bills post PurchaseBillBooked on hydrated seed (FC4)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleVendorBillBooks(hydrated)).toEqual([]);
    const overdue = hydrated.vendorBills.find((b) => b.billNumber === "VB-2026-OVERDUE");
    if (overdue) {
      expect(
        hydrated.accountingVouchers.some(
          (v) => v.sourceDocumentId === overdue.id && v.sourceEvent === "PurchaseBillBooked",
        ),
      ).toBe(true);
    }
  });

  it("approved change requests bill to real invoices on hydrated seed (FC3)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleChangeRequestBilling(hydrated)).toEqual([]);
    const billed = (hydrated.projectChangeRequests ?? []).filter(
      (cr) => cr.status === "approved" && (cr.deltaAmount ?? 0) > 0 && cr.generatedInvoiceId,
    );
    expect(billed.length).toBeGreaterThan(0);
    for (const cr of billed) {
      const inv = hydrated.invoices.find((i) => i.id === cr.generatedInvoiceId);
      expect(inv?.status).not.toBe("draft");
      expect(inv?.projectId).toBe(cr.projectId);
    }
  });

  it("command audit logs use display names not raw member ids", () => {
    const { state } = buildBusinessSeed("smoke");
    const bad = state.auditLogs.filter(
      (l) => l.userName === l.userId && /^[A-Z]{2,4}-\d{3}$/.test(l.userId),
    );
    expect(bad.length, `id-only userName rows: ${bad.slice(0, 3).map((b) => b.id).join(", ")}`).toBe(0);
  });
});
