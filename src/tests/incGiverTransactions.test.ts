import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { deriveIncGiverCompanyEconomics } from "@/lib/deriveIncGiverEconomics";
import { filterProjectsForIncGiverCompany, resolveIncGiverCompanyIdForProject } from "@/lib/incGiverProjectLink";
import { reconcileIncGiverTransactions } from "@/lib/reconcileIncGiverTransactions";
import type { Project } from "@/types/project";

describe("INCGiverTransaction ledger (MD4)", () => {
  it("seed hydrates incGiverTransactions linked to INC_GIVEN projects", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect((hydrated.incGiverTransactions ?? []).length).toBeGreaterThan(0);

    const incProjects = hydrated.projects.filter((p) => p.projectKind === "INC_GIVEN");
    expect(incProjects.length).toBeGreaterThan(0);

    for (const project of incProjects) {
      const giverId = resolveIncGiverCompanyIdForProject(project, hydrated.incGiverCompanies);
      expect(giverId).toBeTruthy();
      expect(project.customerId).toBe(`inc-${giverId}`);
      expect(project.scope?.incGiverCompanyId).toBe(giverId);
    }

    const orphanTx = hydrated.incGiverTransactions.find(
      (t) => !hydrated.incGiverCompanies.some((c) => c.id === t.incGiverCompanyId),
    );
    expect(orphanTx).toBeUndefined();
  });

  it("deriveIncGiverCompanyEconomics uses ledger not stale project rows", () => {
    const companyId = "IGC-001";
    const projects = [
      {
        id: "P1",
        projectKind: "INC_GIVEN",
        customerId: `inc-${companyId}`,
        scope: { incGiverCompanyId: companyId },
        contractAmount: 100000,
        amountReceived: 0,
      } as Project,
    ];
    const transactions = [
      {
        id: "IGT-1",
        incGiverCompanyId: companyId,
        projectId: "P1",
        date: "2026-01-01",
        amount: 40000,
        type: "collection" as const,
      },
    ];
    const companies = [{ id: companyId, name: "Giver A", phone: "1", createdAt: "2026-01-01" }];

    const econ = deriveIncGiverCompanyEconomics(companyId, projects, transactions, companies);
    expect(econ.collected).toBe(40000);
    expect(econ.pending).toBe(60000);
    expect(filterProjectsForIncGiverCompany(projects, companyId, companies)).toHaveLength(1);
  });

  it("reconcileIncGiverTransactions is idempotent", () => {
    const { state } = buildBusinessSeed("smoke");
    const once = reconcileIncGiverTransactions(state);
    const twice = reconcileIncGiverTransactions(once);
    expect(twice.incGiverTransactions?.length).toBe(once.incGiverTransactions?.length);
  });
});
