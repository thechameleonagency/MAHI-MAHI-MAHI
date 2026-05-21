import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { applySeedHydrationPipeline } from "@/data/seed/seedHydration";
import {
  findStaleProjectStartContinuity,
  reconcileProjectAgentCommissionState,
  reconcileProjectStartedAt,
} from "@/lib/projectStartContinuity";
import { markProjectAccrualsPayable } from "@/lib/agentCommissionAccrualPolicy";
import type { Project } from "@/types/project";
import type { AgentCommissionAccrual } from "@/types/operations";

describe("projectStartContinuity (FC5)", () => {
  it("reconcileProjectStartedAt backfills startedAt for in-progress projects", () => {
    const projects = reconcileProjectStartedAt([
      {
        id: "P-1",
        lifecycleStatus: "In Progress",
        startDate: "2026-04-10",
        createdAt: "2026-04-01",
      } as Project,
    ]);
    expect(projects[0]?.startedAt).toContain("2026-04-10");
  });

  it("mark payable via reconcile when project has startedAt", () => {
    const accruals: AgentCommissionAccrual[] = [
      {
        id: "ACC-1",
        agentId: "A1",
        expectedAmount: 1000,
        status: "pending",
        accruedAt: "2026-04-01",
        sourceQuotationId: "Q1",
        projectId: "P1",
      },
    ];
    const next = reconcileProjectAgentCommissionState({
      projects: [
        {
          id: "P1",
          quotationId: "Q1",
          agentId: "A1",
          lifecycleStatus: "In Progress",
          startedAt: "2026-05-01T00:00:00.000Z",
          startDate: "2026-05-01",
          createdAt: "2026-05-01",
        } as Project,
      ],
      quotations: [],
      agents: [],
      agentCommissionAccruals: accruals,
    } as import("@/contexts/AppDataContext").AppState);
    expect(next.agentCommissionAccruals?.[0]?.status).toBe("payable");
  });

  it("hydrated business seed has consistent project start and commission accruals", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applySeedHydrationPipeline(state);
    expect(findStaleProjectStartContinuity(hydrated)).toEqual([]);
    const started = hydrated.projects.filter((p) => p.startedAt);
    expect(started.length).toBeGreaterThan(0);
    const withAgent = started.filter((p) => p.quotationId || p.agentId);
    for (const project of withAgent) {
      const accruals = (hydrated.agentCommissionAccruals ?? []).filter(
        (a) =>
          a.projectId === project.id ||
          (project.quotationId && a.sourceQuotationId === project.quotationId),
      );
      if (accruals.length === 0) continue;
      expect(accruals.some((a) => a.status === "payable" || a.status === "paid")).toBe(true);
    }
  });

  it("hydration pipeline repairs in-progress project missing startedAt", () => {
    const { state } = buildBusinessSeed("smoke");
    const broken = {
      ...state,
      projects: state.projects.map((p, i) =>
        i === 0 && p.lifecycleStatus === "In Progress"
          ? { ...p, startedAt: undefined }
          : p,
      ),
    };
    const hydrated = applyAppStateHydrationPipeline(broken);
    const repaired = hydrated.projects.find((p) => p.id === broken.projects[0]?.id);
    expect(repaired?.startedAt).toBeTruthy();
    expect(findStaleProjectStartContinuity(hydrated)).toEqual([]);
  });

  it("markProjectAccrualsPayable is idempotent for already payable rows", () => {
    const accruals: AgentCommissionAccrual[] = [
      {
        id: "ACC-1",
        agentId: "A1",
        expectedAmount: 1000,
        status: "payable",
        accruedAt: "2026-04-01",
        payableAt: "2026-05-01",
        projectId: "P1",
      },
    ];
    const next = markProjectAccrualsPayable(accruals, "P1", undefined, "2026-06-01");
    expect(next[0].payableAt).toBe("2026-05-01");
  });
});
