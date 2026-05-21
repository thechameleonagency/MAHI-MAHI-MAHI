import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  findStaleIncGiverLedger,
  resolveIncGivenProjectAmountReceived,
} from "@/lib/incGiverLedgerContinuity";
import { reconcileIncGiverTransactions } from "@/lib/reconcileIncGiverTransactions";
import { deriveIncGiverProjectCollected } from "@/lib/deriveIncGiverEconomics";
import type { Project } from "@/types/project";

describe("incGiverLedgerContinuity (ER4)", () => {
  it("hydrated smoke seed has no stale INC giver ledger drift", () => {
    const { state: seeded } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(seeded);
    const stale = findStaleIncGiverLedger(hydrated);
    expect(stale, stale.map((s) => `${s.entity}:${s.id}:${s.reason}`).join("; ")).toEqual([]);
  });

  it("resolveIncGivenProjectAmountReceived prefers ledger over stale project row", () => {
    const project = {
      id: "P-INC",
      projectKind: "INC_GIVEN",
      customerId: "inc-IGC-1",
      scope: { incGiverCompanyId: "IGC-1" },
      contractAmount: 100000,
      amountReceived: 5000,
    } as Project;
    const transactions = [
      {
        id: "IGT-1",
        incGiverCompanyId: "IGC-1",
        projectId: "P-INC",
        date: "2026-01-01",
        amount: 40000,
        type: "collection" as const,
      },
    ];
    expect(
      resolveIncGivenProjectAmountReceived(project, transactions, [], []),
    ).toBe(40000);
  });

  it("reconcileIncGiverTransactions syncs project.amountReceived to ledger", () => {
    const { state } = buildBusinessSeed("smoke");
    const inc = state.projects.find((p) => p.projectKind === "INC_GIVEN");
    expect(inc).toBeTruthy();
    const broken = {
      ...state,
      projects: state.projects.map((p) =>
        p.id === inc!.id ? { ...p, amountReceived: 1 } : p,
      ),
    };
    const fixed = reconcileIncGiverTransactions(broken);
    const fixedProject = fixed.projects.find((p) => p.id === inc!.id)!;
    const ledger = deriveIncGiverProjectCollected(
      inc!.id,
      fixed.incGiverTransactions ?? [],
    );
    expect(Math.abs((fixedProject.amountReceived ?? 0) - ledger)).toBeLessThan(0.02);
    expect(findStaleIncGiverLedger(fixed)).toEqual([]);
  });

  it("full seed verification passes ER4 checks", () => {
    const { verification } = buildBusinessSeed("full");
    const er4 = verification.errors.filter((e) => e.startsWith("ER4:"));
    expect(er4).toEqual([]);
  });
});
