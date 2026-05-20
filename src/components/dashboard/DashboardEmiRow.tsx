import { Link } from "react-router-dom";
import { CreditCard, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Loan } from "@/types/finance";
import { format } from "date-fns";

export function DashboardEmiRow({
  loan,
  dueDate,
  tone,
}: {
  loan: Loan;
  dueDate: Date | null;
  tone: "overdue" | "due";
}) {
  const borrower = loan.personName?.trim() || loan.source || "Borrower";
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{borrower}</p>
          <p className="text-xs text-muted-foreground">
            {dueDate ? `Due ${format(dueDate, "d MMM yyyy")}` : "Due date unknown"}
            {" · "}₹{(loan.emiAmount || 0).toLocaleString("en-IN")}
          </p>
          <Badge
            variant="outline"
            className={
              tone === "overdue"
                ? "text-2xs border-destructive/40 text-destructive"
                : "text-2xs border-warning/40 text-warning"
            }
          >
            {tone === "overdue" ? "Overdue EMI" : "Due soon"}
          </Badge>
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
