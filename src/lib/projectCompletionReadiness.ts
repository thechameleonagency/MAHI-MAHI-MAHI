import {
  ProjectInvariantService,
  type ProjectInvariantWorld,
} from "@/domain/project/ProjectInvariantService";
import {
  accountingReviewQueueItemsForProject,
  ACCOUNTING_REVIEW_QUEUE_COMPLETION_BLOCK_REASON,
} from "@/lib/accountingReviewQueueGuidance";
import {
  projectCompletionInvoiceBlockReason,
  type ProjectCompletionInvoiceDoc,
} from "@/lib/projectCompletionInvoice";
import type { Project } from "@/types/project";

export type ProjectCompletionReadiness = {
  canComplete: boolean;
  /** Invoice-specific gate (also included in invariant reasons when applicable). */
  invoiceBlockReason: string | null;
  /** All invariant reasons from ProjectInvariantService. */
  invariantReasons: string[];
  /** First user-facing blocker for buttons / tooltips. */
  primaryBlocker: string | null;
  accountingReviewQueueItems: ReturnType<typeof accountingReviewQueueItemsForProject>;
  accountingReviewQueueBlocked: boolean;
};

const invariantService = new ProjectInvariantService();

export function evaluateProjectCompletionReadiness(input: {
  projectId: string;
  project: Project;
  projectInvoices: ProjectCompletionInvoiceDoc[];
  world: ProjectInvariantWorld;
}): ProjectCompletionReadiness {
  const invoiceBlockReason = projectCompletionInvoiceBlockReason(input.project, input.projectInvoices);
  const { ok, reasons } = invariantService.canMarkCompleted(input.projectId, input.world);
  const accountingReviewQueueItems = accountingReviewQueueItemsForProject(
    input.world.accountingReviewQueue,
    input.projectId,
    input.world,
  );
  const accountingReviewQueueBlocked = reasons.some((r) =>
    r.includes(ACCOUNTING_REVIEW_QUEUE_COMPLETION_BLOCK_REASON),
  );

  const invariantReasons = reasons;
  const canComplete = ok && !invoiceBlockReason;
  const primaryBlocker =
    invoiceBlockReason ?? (invariantReasons.length > 0 ? invariantReasons[0] : null);

  return {
    canComplete,
    invoiceBlockReason,
    invariantReasons,
    primaryBlocker,
    accountingReviewQueueItems,
    accountingReviewQueueBlocked,
  };
}
