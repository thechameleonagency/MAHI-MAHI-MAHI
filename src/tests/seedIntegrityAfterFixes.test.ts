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

const DRIFT_EPS = 1;

describe("seed & hydration integrity after audit fixes", () => {
  it("full business seed passes verifySeedState", () => {
    const { verification } = buildBusinessSeed("full");
    if (!verification.ok) {
      console.error("Seed errors:", verification.errors);
    }
    expect(verification.ok, verification.errors.join("; ")).toBe(true);
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

  it("inc giver transactions reference valid companies and INC_GIVEN projects", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect((hydrated.incGiverTransactions ?? []).length).toBeGreaterThan(0);
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

  it("enquiry assignees use member id and resolved display name", () => {
    const { state } = buildBusinessSeed("smoke");
    const members = new Map(state.settingsTeamMembers.map((m) => [m.id, m.name]));
    const bad = state.enquiries.filter((e) => {
      if (!e.assignedToMemberId?.trim()) return Boolean(e.assignedTo?.trim());
      const name = members.get(e.assignedToMemberId);
      return !name || e.assignedTo !== name;
    });
    expect(bad.slice(0, 5).map((e) => e.id)).toEqual([]);
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
