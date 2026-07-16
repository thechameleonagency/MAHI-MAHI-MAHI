import { useNavigate } from "react-router-dom";
import { format, isValid, parseISO } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Enquiry } from "@/types/project";
import { formatINRCompact } from "@/lib/formatCurrency";

const STATUS_META: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  meeting_scheduled: {
    label: "Meeting scheduled",
    className: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  quotation_sent: {
    label: "Quotation sent",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  quotation_rejected: {
    label: "Quotation rejected",
    className: "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  converted: {
    label: "Converted",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  lost: { label: "Lost", className: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};

const VISIT_LABEL: Record<string, string> = {
  confirmed: "Visit: confirmed",
  rejected: "Visit: rejected",
  postponed: "Visit: postponed",
};

function fmtDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? format(d, "dd MMM yyyy") : null;
}

export interface EnquiryDrilldown {
  title: string;
  description?: string;
  enquiries: Enquiry[];
}

/**
 * Drilldown sheet: shows the enquiries behind any chart segment / metric on
 * the Enquiries & Sales analytics tab, with a jump into the Enquiries page.
 */
export function EnquiryListSheet({
  drilldown,
  onClose,
}: {
  drilldown: EnquiryDrilldown | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Sheet open={drilldown !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-lg">
        <SheetHeader className="pb-3">
          <SheetTitle>{drilldown?.title}</SheetTitle>
          <SheetDescription>
            {drilldown?.description ?? `${drilldown?.enquiries.length ?? 0} enquiries`}
          </SheetDescription>
        </SheetHeader>
        <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1 pb-4">
          {drilldown?.enquiries.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nothing here for the current filters.
            </p>
          )}
          {drilldown?.enquiries.map((e) => {
            const status = STATUS_META[e.status] ?? { label: e.status, className: "" };
            const created = fmtDate(e.createdAt);
            const visitDate = fmtDate(e.siteVisitDate);
            const docsDate = fmtDate(e.docsPromisedDate);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => navigate(`/enquiries?open=${encodeURIComponent(e.id)}`)}
                className="w-full rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">{e.customerName}</p>
                  <Badge variant="outline" className={`shrink-0 text-2xs ${status.className}`}>
                    {status.label}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[
                    e.systemCapacity,
                    e.estimatedBudget ? formatINRCompact(e.estimatedBudget) : null,
                    e.assignedTo?.trim() || "Unassigned",
                    created ? `created ${created}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {(e.siteVisitOutcome || visitDate || e.docsStatus) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      e.siteVisitOutcome
                        ? VISIT_LABEL[e.siteVisitOutcome]
                        : visitDate
                          ? `Visit planned ${visitDate}`
                          : null,
                      e.docsStatus === "collected"
                        ? "Docs collected"
                        : e.docsStatus === "promised"
                          ? `Docs promised${docsDate ? ` for ${docsDate}` : ""}`
                          : e.docsStatus === "pending"
                            ? "Docs pending"
                            : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </button>
            );
          })}
        </div>
        <div className="border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate("/enquiries")}
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Open Enquiries page
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
