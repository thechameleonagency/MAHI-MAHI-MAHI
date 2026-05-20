import { Badge } from "@/components/ui/badge";
import type { ExpenseReimbursement } from "@/types/finance";
import { formatReimbursementApprovalLine } from "@/lib/expenseReimbursement";
import { formatINR } from "@/lib/formatCurrency";

type Props = {
  reimbursement: ExpenseReimbursement | undefined;
  className?: string;
};

/** Reimbursement status chip + approval line when paid. */
export function ExpenseReimbursementStatus({ reimbursement, className }: Props) {
  if (!reimbursement?.enabled) return null;

  const approvalLine = formatReimbursementApprovalLine(reimbursement);
  const isPending = reimbursement.status === "pending";

  return (
    <div className={`flex flex-col gap-0.5 items-start ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={
            isPending
              ? "text-2xs border-warning/40 bg-warning/10 text-warning"
              : "text-2xs border-primary/30 bg-primary/10 text-primary"
          }
        >
          {isPending ? "Reimb. pending" : "Reimbursed"}
          {reimbursement.amount > 0 ? ` · ${formatINR(reimbursement.amount)}` : ""}
        </Badge>
      </div>
      {approvalLine ? (
        <span className="text-2xs text-muted-foreground leading-tight">{approvalLine}</span>
      ) : isPending ? (
        <span className="text-2xs text-muted-foreground leading-tight">Awaiting approval</span>
      ) : null}
    </div>
  );
}
