import type { ProjectInvariantWorld } from "@/domain/project/ProjectInvariantService";
import type { AccountingReviewQueueItem } from "@/types/finance";

/** Matches ProjectInvariantService.canMarkCompleted queue gate. */
export const ACCOUNTING_REVIEW_QUEUE_COMPLETION_BLOCK_REASON =
  "Clear or retry accounting review queue items for this project before completion.";

export const ACCOUNTING_REVIEW_DISMISS_HELP =
  "Dismiss removes the item from this queue without posting a voucher. Use when books were corrected manually or the event cannot auto-post in this prototype. Completion stays blocked until no queue rows remain for this project.";

export const ACCOUNTING_REVIEW_RETRY_HELP =
  "Retry re-runs voucher auto-post with current chart-of-accounts mapping.";

export const FINANCE_ACCOUNTING_REVIEW_QUEUE_PATH = "/finance";

/** Resolve queue rows that block completion for a project (direct projectId or linked documents). */
export function accountingReviewQueueItemsForProject(
  queue: AccountingReviewQueueItem[],
  projectId: string,
  world: Pick<ProjectInvariantWorld, "invoices" | "saleBills" | "expenses" | "incomes">,
): AccountingReviewQueueItem[] {
  return queue.filter((q) => queueItemTouchesProject(q, projectId, world));
}

export function queueItemTouchesProject(
  item: AccountingReviewQueueItem,
  projectId: string,
  world: Pick<ProjectInvariantWorld, "invoices" | "saleBills" | "expenses" | "incomes">,
): boolean {
  if (item.projectId === projectId) return true;
  const inv = [...world.invoices, ...world.saleBills].find((i) => i.id === item.sourceDocumentId);
  if (inv?.projectId === projectId) return true;
  const exp = world.expenses.find((e) => e.id === item.sourceDocumentId);
  if (exp?.projectId === projectId) return true;
  return world.incomes.some((inc) => inc.id === item.sourceDocumentId && inc.projectId === projectId);
}

export function projectHasAccountingReviewQueueBlock(
  queue: AccountingReviewQueueItem[],
  projectId: string,
  world: Pick<ProjectInvariantWorld, "invoices" | "saleBills" | "expenses" | "incomes">,
): boolean {
  return accountingReviewQueueItemsForProject(queue, projectId, world).length > 0;
}
