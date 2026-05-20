import { Link } from "react-router-dom";
import { ExternalLink, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/types/finance";
import { AgingChip } from "@/components/ui/AgingChip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getInvoiceOverdueAging } from "@/lib/agingHelpers";
import { formatINR } from "@/lib/formatCurrency";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import {
  formatInvoiceBalanceLabel,
  formatInvoiceStatusLabel,
  invoiceExcessReceived,
} from "@/lib/invoicePaymentStatus";

export function DashboardInvoiceRow({ invoice }: { invoice: Invoice }) {
  const aging = getInvoiceOverdueAging(invoice);
  const isOverpaid = invoice.status === "overpaid";
  const excess = invoiceExcessReceived(invoice.total || 0, invoice.amountReceived || 0);
  const balanceLabel = formatInvoiceBalanceLabel(
    invoice.total || 0,
    invoice.amountReceived || 0,
    invoice.status,
  );

  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">
            {invoice.customerId ? (
              <EntityLink
                entityType="customer"
                entityId={invoice.customerId}
                name={invoice.customerName}
              />
            ) : (
              invoice.customerName
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {invoice.invoiceNumber} · {isOverpaid ? balanceLabel : `Balance ${balanceLabel}`}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge
              status={invoice.status}
              label={formatInvoiceStatusLabel(invoice.status)}
            />
            {isOverpaid && excess > 0 && (
              <span className="text-2xs font-medium text-violet-700 dark:text-violet-300">
                +{formatINR(excess)} excess
              </span>
            )}
            {aging && <AgingChip signal={aging} />}
          </div>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8" asChild>
          <Link to={isOverpaid ? "/invoices?status=overpaid" : "/invoices"}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
        <Link to={isOverpaid ? "/invoices?status=overpaid" : "/invoices"}>
          <IndianRupee className="mr-1 h-3 w-3" />
          {isOverpaid ? "View overpaid" : "Open invoices"}
        </Link>
      </Button>
    </div>
  );
}
