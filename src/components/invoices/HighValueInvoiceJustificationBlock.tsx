import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HIGH_VALUE_INVOICE_THRESHOLD_INR,
  isHighValueInvoiceAmount,
} from "@/application/services/BillingDirectionGuardService";
import { formatINR } from "@/lib/formatCurrency";

type HighValueInvoiceJustificationBlockProps = {
  total: number;
  reason: string;
  onReasonChange: (value: string) => void;
};

/** Warning + reason field when invoice total exceeds the high-value threshold. */
export function HighValueInvoiceJustificationBlock({
  total,
  reason,
  onReasonChange,
}: HighValueInvoiceJustificationBlockProps) {
  if (!isHighValueInvoiceAmount(total)) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
      <InlineConfirmBanner
        variant="warning"
        autoDismissMs={0}
        title={`High-value invoice (${formatINR(total)})`}
        description={`Totals above ${formatINR(HIGH_VALUE_INVOICE_THRESHOLD_INR)} require a written justification before issuance. This is logged in the audit trail.`}
        onDismiss={undefined}
      />
      <div className="space-y-2">
        <Label htmlFor="high-value-invoice-reason">
          Justification <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="high-value-invoice-reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g. Final milestone billing per approved change order CO-2026-04"
          rows={3}
          className="resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Minimum 10 characters. Required to create or issue this document.
        </p>
      </div>
    </div>
  );
}
