import { Link } from "react-router-dom";
import { Calendar, FileText, Send, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Enquiry } from "@/types/project";
import { AgingChip } from "@/components/ui/AgingChip";
import { getEnquiryFollowUpAging } from "@/lib/agingHelpers";
import { format } from "date-fns";

export function DashboardEnquiryRow({
  enquiry,
  onScheduleMeeting,
  onSendQuotation,
  onConvert,
  onCreateQuotation,
}: {
  enquiry: Enquiry;
  onScheduleMeeting: () => void;
  onSendQuotation: () => void;
  onConvert: () => void;
  onCreateQuotation: () => void;
}) {
  const aging = getEnquiryFollowUpAging(enquiry);
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{enquiry.customerName}</p>
          <p className="text-xs text-muted-foreground">
            {enquiry.customerPhone}
            {enquiry.followUpDate ? ` · Follow-up ${format(new Date(enquiry.followUpDate), "d MMM")}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="capitalize text-2xs">
              {enquiry.status.replace(/_/g, " ")}
            </Badge>
            {aging && <AgingChip signal={aging} />}
            {enquiry.priority === "high" && (
              <Badge variant="outline" className="text-2xs border-amber-500/40 text-amber-700">
                High priority
              </Badge>
            )}
          </div>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8" asChild>
          <Link to="/enquiries" state={{ focusEnquiryId: enquiry.id }}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(enquiry.status === "new" || enquiry.status === "meeting_scheduled") && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onScheduleMeeting}>
              <Calendar className="mr-1 h-3 w-3" />
              Schedule
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSendQuotation}>
              <Send className="mr-1 h-3 w-3" />
              Mark quote sent
            </Button>
          </>
        )}
        {enquiry.status === "quotation_sent" && (
          <Button size="sm" className="h-7 text-xs" onClick={onConvert}>
            <Check className="mr-1 h-3 w-3" />
            Mark converted
          </Button>
        )}
        {enquiry.status === "converted" && !enquiry.quotationId && (
          <Button size="sm" className="h-7 text-xs" onClick={onCreateQuotation}>
            <FileText className="mr-1 h-3 w-3" />
            Create quotation
          </Button>
        )}
      </div>
    </div>
  );
}
