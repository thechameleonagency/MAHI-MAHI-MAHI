import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  accountingReviewQueueItemsForProject,
  ACCOUNTING_REVIEW_QUEUE_COMPLETION_BLOCK_REASON,
  projectHasAccountingReviewQueueBlock,
  queueItemTouchesProject,
} from "@/lib/accountingReviewQueueGuidance";
import { evaluateProjectCompletionReadiness } from "@/lib/projectCompletionReadiness";
import { ProjectInvariantService } from "@/domain/project/ProjectInvariantService";

describe("accountingReviewQueueGuidance (EC1)", () => {
  it("seed includes a training queue row linked to an in-progress EPC project", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const training = hydrated.accountingReviewQueue.find((q) =>
      q.reason.includes("Training sample"),
    );
    expect(training).toBeDefined();
    expect(training?.projectId).toBeTruthy();

    const project = hydrated.projects.find((p) => p.id === training?.projectId);
    expect(project?.lifecycleStatus).toBe("In Progress");

    const linked = accountingReviewQueueItemsForProject(
      hydrated.accountingReviewQueue,
      training!.projectId!,
      hydrated,
    );
    expect(linked.some((q) => q.id === training!.id)).toBe(true);
  });

  it("blocks completion while queue touches project; clears after filter-empty world", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const training = hydrated.accountingReviewQueue.find((q) => q.projectId);
    expect(training?.projectId).toBeTruthy();

    const project = hydrated.projects.find((p) => p.id === training!.projectId)!;
    const world = {
      projects: [project],
      invoices: hydrated.invoices,
      saleBills: hydrated.saleBills,
      expenses: hydrated.expenses,
      incomes: hydrated.incomes,
      blockages: hydrated.blockages.filter((b) => b.projectId === project.id),
      accountingReviewQueue: hydrated.accountingReviewQueue,
      attendanceRecords: hydrated.attendanceRecords,
      partnerTransactions: hydrated.partnerTransactions,
    };

    expect(projectHasAccountingReviewQueueBlock(world.accountingReviewQueue, project.id, world)).toBe(
      true,
    );

    const svc = new ProjectInvariantService();
    const blocked = svc.canMarkCompleted(project.id, world);
    expect(blocked.ok).toBe(false);
    expect(blocked.reasons).toContain(ACCOUNTING_REVIEW_QUEUE_COMPLETION_BLOCK_REASON);

    const readiness = evaluateProjectCompletionReadiness({
      projectId: project.id,
      project,
      projectInvoices: [...hydrated.invoices, ...hydrated.saleBills].filter(
        (i) => i.projectId === project.id,
      ),
      world,
    });
    expect(readiness.canComplete).toBe(false);
    expect(readiness.accountingReviewQueueBlocked).toBe(true);
    expect(readiness.accountingReviewQueueItems.length).toBeGreaterThan(0);

    const cleared = {
      ...world,
      accountingReviewQueue: world.accountingReviewQueue.filter(
        (q) => !queueItemTouchesProject(q, project.id, world),
      ),
    };
    expect(projectHasAccountingReviewQueueBlock(cleared.accountingReviewQueue, project.id, cleared)).toBe(
      false,
    );
  });
});
