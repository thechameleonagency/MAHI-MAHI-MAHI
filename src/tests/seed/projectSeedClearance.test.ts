import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { seedIncludesProjects } from "@/data/seed/seedProjectPhase";
import { findSeedForeignKeyViolations } from "@/data/seed/seedForeignKeyMatrix";

const PROJECT_LINKED_COLLECTIONS = [
  "sites",
  "tasks",
  "blockages",
  "scheduledInstallations",
  "siteVisits",
  "projectChangeRequests",
  "materialReservations",
  "materialDamageRecords",
  "procurementNeedLines",
  "clientPaymentRecords",
  "incGiverTransactions",
  "agentCommissionPayments",
] as const;

describe("Phase 0.2 — project seed clearance", () => {
  it.skipIf(seedIncludesProjects())("full seed has zero projects and no project-linked rows", () => {
    const { state, verification } = buildBusinessSeed("full");

    expect(verification.ok, verification.errors.join("; ")).toBe(true);
    expect(state.projects).toHaveLength(0);
    expect(Object.keys(state.projectTimelineByProjectId)).toHaveLength(0);

    for (const key of PROJECT_LINKED_COLLECTIONS) {
      expect(state[key], key).toHaveLength(0);
    }

    expect(state.invoices.every((inv) => !inv.projectId)).toBe(true);
    expect(state.saleBills.every((inv) => !inv.projectId)).toBe(true);
    expect(state.expenses.every((exp) => !exp.projectId && !exp.allocation?.projectId)).toBe(true);
    expect(state.incomes.every((inc) => !inc.projectId)).toBe(true);
    expect(state.payments.every((pay) => !pay.projectId)).toBe(true);
    expect(state.vendorBills.every((bill) => !bill.projectId)).toBe(true);
    expect(state.partnerTransactions.every((tx) => !tx.projectId)).toBe(true);
    expect(state.agentCommissionAccruals.every((acc) => !acc.projectId)).toBe(true);
    expect(state.quotations.every((q) => !q.linkedProjectId)).toBe(true);
    expect(state.quotations.every((q) => q.status !== "converted_to_project")).toBe(true);

    expect(findSeedForeignKeyViolations(state)).toEqual([]);
  });
});
