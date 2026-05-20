import { LifecycleTermHint } from "@/components/ui/LifecycleTermHint";
import {
  hasDistinctClientAgreedAmount,
  resolveContractAmount,
} from "@/domain/quotation/quotationCommercialAmount";
import { formatINR } from "@/lib/formatCurrency";
import type { Quotation } from "@/types/project";

/** View-sheet / header display for quoted total vs client agreed contract value. */
export function QuotationCommercialAmountDisplay({
  quotation,
  className,
}: {
  quotation: Pick<Quotation, "clientAgreedAmount" | "totalAmount">;
  className?: string;
}) {
  const contract = resolveContractAmount(quotation);
  const distinct = hasDistinctClientAgreedAmount(quotation);

  return (
    <div className={className}>
      <p className="text-2xs text-muted-foreground mb-1 uppercase tracking-tighter inline-flex items-center gap-1 justify-end">
        Contract value
        <LifecycleTermHint term="quotationClientAgreedAmount" side="left" align="end" />
      </p>
      <p className="text-lg font-bold text-primary tabular-nums">{formatINR(contract)}</p>
      {distinct ? (
        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
          <span className="inline-flex items-center gap-0.5">
            Quoted {formatINR(quotation.totalAmount)}
            <LifecycleTermHint term="quotationQuotedTotal" side="left" align="end" iconClassName="h-3 w-3" />
          </span>
          {" · "}
          Agreed {formatINR(quotation.clientAgreedAmount!)}
        </p>
      ) : null}
    </div>
  );
}
