import { FileText } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatQuotationStatusLabel } from "@/lib/quotationStatusUi";
import type { Quotation } from "@/types/project";
import { formatINR } from "@/lib/formatCurrency";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { resolveQuotationCustomerId } from "@/lib/selectors";
import { AgingChip } from "@/components/ui/AgingChip";
import { getQuotationInFlightAging } from "@/lib/agingHelpers";
import {
  DashboardCompactRowMenu,
  DashboardCompactRowMenuLink,
} from "@/components/dashboard/DashboardCompactRowMenu";

export function DashboardQuotationRow({ quotation }: { quotation: Quotation }) {
  const customerId = resolveQuotationCustomerId(quotation);
  const aging = getQuotationInFlightAging(quotation);

  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">
            {customerId ? (
              <EntityLink
                entityType="customer"
                entityId={customerId}
                name={quotation.clientName}
              />
            ) : (
              quotation.clientName
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {quotation.quotationNumber} · {formatINR(quotation.totalAmount || 0)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge
              status={quotation.status}
              label={formatQuotationStatusLabel(quotation.status)}
              className="text-2xs"
            />
            <AgingChip signal={aging} />
          </div>
        </div>
        <DashboardCompactRowMenu>
          <DashboardCompactRowMenuLink
            to="/quotations"
            state={{ focusQuotationId: quotation.id }}
            icon={FileText}
          >
            Open quotation
          </DashboardCompactRowMenuLink>
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}
