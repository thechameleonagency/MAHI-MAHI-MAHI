import { Link } from "react-router-dom";
import { ExternalLink, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/types/finance";
import { AgingChip } from "@/components/ui/AgingChip";
import { getInvoiceOverdueAging } from "@/lib/agingHelpers";
import { formatINR } from "@/lib/formatCurrency";
import { EntityLink } from "@/components/shared/EntityInfoSheet";

export function DashboardInvoiceRow({ invoice }: { invoice: Invoice }) {
  const balance = Math.max(0, (invoice.total || 0) - (invoice.amountReceived || 0));
  const aging = getInvoiceOverdueAging(invoice);
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
            {invoice.invoiceNumber} · Balance {formatINR(balance)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="capitalize text-2xs">
              {invoice.status}
            </Badge>
            {aging && <AgingChip signal={aging} />}
          </div>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8" asChild>
          <Link to="/invoices">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
        <Link to="/invoices">
          <IndianRupee className="mr-1 h-3 w-3" />
          Open invoices
        </Link>
      </Button>
    </div>
  );
}
