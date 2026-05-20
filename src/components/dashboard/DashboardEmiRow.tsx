import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Loan, LoanRepayment } from "@/types/finance";
import { formatINR } from "@/lib/formatCurrency";
import { AgingChip } from "@/components/ui/AgingChip";
import { getLoanDashboardAging } from "@/lib/agingHelpers";
import {
  DashboardCompactRowMenu,
  DashboardCompactRowMenuLink,
} from "@/components/dashboard/DashboardCompactRowMenu";

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
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
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
        <DashboardCompactRowMenu>
          <DashboardCompactRowMenuLink to="/loans" icon={CreditCard}>
            Record payment
          </DashboardCompactRowMenuLink>
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}
