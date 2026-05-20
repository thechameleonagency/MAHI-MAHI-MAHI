import { Link } from "react-router-dom";
import { ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Quotation } from "@/types/project";
import { formatINR } from "@/lib/formatCurrency";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { resolveQuotationCustomerId } from "@/lib/selectors";

export function DashboardQuotationRow({ quotation }: { quotation: Quotation }) {
  const customerId = resolveQuotationCustomerId(quotation);
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3 space-y-2">
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
          <Badge variant="secondary" className="capitalize text-2xs">
            {quotation.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8" asChild>
          <Link to="/quotations" state={{ focusQuotationId: quotation.id }}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
        <Link to="/quotations" state={{ focusQuotationId: quotation.id }}>
          <FileText className="mr-1 h-3 w-3" />
          Open quotation
        </Link>
      </Button>
    </div>
  );
}
