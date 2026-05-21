import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ACCOUNTING_REVIEW_DISMISS_HELP,
  ACCOUNTING_REVIEW_RETRY_HELP,
  FINANCE_ACCOUNTING_REVIEW_QUEUE_PATH,
} from "@/lib/accountingReviewQueueGuidance";
import type { ProjectCompletionReadiness } from "@/lib/projectCompletionReadiness";
import { formatINR } from "@/lib/formatCurrency";

type Props = {
  readiness: ProjectCompletionReadiness | null;
  className?: string;
};

/** EC1 — explain completion blockers, especially accounting review queue dismiss escape hatch. */
export function ProjectCompletionHelpBanner({ readiness, className }: Props) {
  if (!readiness || readiness.canComplete) return null;

  const { invariantReasons, accountingReviewQueueItems, accountingReviewQueueBlocked } = readiness;

  return (
    <Alert className={className ?? "border-warning/40 bg-warning/5"}>
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-sm">Before you mark this project complete</AlertTitle>
      <AlertDescription className="space-y-2 text-xs text-muted-foreground">
        <ul className="list-disc space-y-1 pl-4 text-foreground">
          {readiness.invoiceBlockReason ? <li>{readiness.invoiceBlockReason}</li> : null}
          {invariantReasons
            .filter((r) => r !== readiness.invoiceBlockReason)
            .map((r) => (
              <li key={r}>{r}</li>
            ))}
        </ul>

        {accountingReviewQueueBlocked && accountingReviewQueueItems.length > 0 ? (
          <div className="rounded-md border border-warning/30 bg-card/60 p-2.5 space-y-2">
            <p className="font-medium text-foreground text-xs">
              Accounting review queue ({accountingReviewQueueItems.length} item
              {accountingReviewQueueItems.length === 1 ? "" : "s"} for this project)
            </p>
            <ul className="space-y-1">
              {accountingReviewQueueItems.slice(0, 4).map((item) => (
                <li key={item.id} className="font-mono text-2xs text-muted-foreground">
                  {item.eventType} · {item.sourceDocumentId} — {formatINR(item.amount)} — {item.reason}
                </li>
              ))}
            </ul>
            <p>{ACCOUNTING_REVIEW_RETRY_HELP}</p>
            <p>{ACCOUNTING_REVIEW_DISMISS_HELP}</p>
            <p>
              Open{" "}
              <Link
                to={FINANCE_ACCOUNTING_REVIEW_QUEUE_PATH}
                className="text-primary underline-offset-2 hover:underline"
              >
                Finance → Accounting review queue
              </Link>{" "}
              to retry or dismiss, then return here to complete the project.
            </p>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
