import { IndianRupee } from "lucide-react";
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
import {
  DashboardCompactRowMenu,
  DashboardCompactRowMenuLink,
} from "@/components/dashboard/DashboardCompactRowMenu";

export function DashboardInvoiceRow({ invoice }: { invoice: Invoice }) {
  const aging = getInvoiceOverdueAging(invoice);
  const isOverpaid = invoice.status === "overpaid";
  const excess = invoiceExcessReceived(invoice.total || 0, invoice.amountReceived || 0);
  const balanceLabel = formatInvoiceBalanceLabel(
    invoice.total || 0,
    invoice.amountReceived || 0,
    invoice.status,
  );
  const listHref = isOverpaid ? "/invoices?status=overpaid" : "/invoices";

  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
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
        <DashboardCompactRowMenu>
          <DashboardCompactRowMenuLink to={listHref} icon={IndianRupee}>
            {isOverpaid ? "View overpaid" : "Open invoices"}
          </DashboardCompactRowMenuLink>
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}
