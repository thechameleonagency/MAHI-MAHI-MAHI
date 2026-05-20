import { Link } from "react-router-dom";
import { CreditCard, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Loan, LoanRepayment } from "@/types/finance";
import { formatINR } from "@/lib/formatCurrency";
import { AgingChip } from "@/components/ui/AgingChip";
import { getLoanDashboardAging } from "@/lib/agingHelpers";

export function DashboardEmiRow({
  loan,
  loanRepayments = [],
}: {
  loan: Loan;
  loanRepayments?: Pick<LoanRepayment, "loanId" | "date">[];
}) {
  const borrower = loan.personName?.trim() || loan.source || "Borrower";
  const aging = getLoanDashboardAging(loan, loanRepayments);
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{borrower}</p>
          <p className="text-xs text-muted-foreground">
            Outstanding {formatINR(loan.outstanding || 0)}
            {loan.emiAmount ? ` · EMI ${formatINR(loan.emiAmount)}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-2xs capitalize">
              {loan.paymentType.replace(/-/g, " ")}
            </Badge>
            <AgingChip signal={aging} />
          </div>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8" asChild>
          <Link to="/loans">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs w-full sm:w-auto" asChild>
        <Link to="/loans">
          <CreditCard className="mr-1 h-3 w-3" />
          Record payment
        </Link>
      </Button>
    </div>
  );
}
