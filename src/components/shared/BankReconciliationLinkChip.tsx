import { Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBankReconciliationLinkLabel } from "@/lib/bankReconciliationLink";
import type { BankReconciliationLink } from "@/types/finance";

interface BankReconciliationLinkChipProps {
  link: BankReconciliationLink;
  className?: string;
}

/** Read-only indicator that a ledger row was matched to an uploaded bank/cash statement line (E9). */
export function BankReconciliationLinkChip({ link, className }: BankReconciliationLinkChipProps) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs ${className ?? ""}`}
    >
      <Landmark className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" aria-hidden />
      <span className="text-foreground">{formatBankReconciliationLinkLabel(link)}</span>
      {link.matchFlag === "possible-match" && (
        <Badge variant="outline" className="ml-auto shrink-0 text-2xs">
          Possible
        </Badge>
      )}
    </div>
  );
}
